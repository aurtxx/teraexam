import csv
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.db import models, transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.models import AuditLog
from .models import (
    Institution, Batch, UserProfile, Subject, Topic, Question,
    Exam, ExamSection, ExamQuestion, ExamAttempt, StudentAnswer, Announcement,
    ProctoringEvent, ExamStudentOverride
)
from .serializers import (
    InstitutionSerializer, BatchSerializer, SubjectSerializer, TopicSerializer,
    QuestionSerializer, StudentLiveQuestionSerializer, ExamListSerializer,
    ExamDetailSerializer, ExamQuestionSerializer, ExamAttemptSerializer,
    StudentAnswerSerializer, AnnouncementSerializer, UserProfileSerializer,
    ProctoringEventSerializer, ExamStudentOverrideSerializer
)
from .services import (
    calculate_ranks_and_percentiles, get_exam_analytics,
    get_student_scorecard, bulk_import_questions, bulk_import_students
)
from .subscription import (
    get_institution_usage, check_student_quota, check_exam_quota, check_question_quota
)
from .reports import (
    generate_printable_scorecard_html, generate_printable_merit_list_html
)
from .audit import log_audit_event


def get_user_profile(user):
    """Safely retrieves or lazily creates a UserProfile for any user."""
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={'role': 'PLATFORM_ADMIN' if user.is_superuser else ('TEACHER' if user.is_staff else 'STUDENT')}
    )
    return profile


class BaseTenantViewSet(viewsets.ModelViewSet):
    """
    Base viewset enforcing multi-tenant isolation.
    Data is scoped strictly to the authenticated user's institution.
    """
    permission_classes = [IsAuthenticated]

    def get_user_profile(self):
        return get_user_profile(self.request.user)

    def get_institution(self):
        profile = self.get_user_profile()
        if profile.role == 'PLATFORM_ADMIN':
            inst_id = self.request.query_params.get('institution_id')
            if inst_id:
                return Institution.objects.filter(id=inst_id).first()
            return profile.institution or Institution.objects.first()
        return profile.institution


class InstitutionViewSet(BaseTenantViewSet):
    serializer_class = InstitutionSerializer

    def get_queryset(self):
        profile = self.get_user_profile()
        if profile.role == 'PLATFORM_ADMIN':
            return Institution.objects.all()
        if profile.institution:
            return Institution.objects.filter(id=profile.institution.id)
        return Institution.objects.none()

    @action(detail=False, methods=['get'])
    def current(self, request):
        inst = self.get_institution()
        if not inst:
            return Response({'detail': 'No institution associated with user'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(inst)
        return Response(serializer.data)

    @action(detail=False, methods=['patch', 'put'])
    def update_branding(self, request):
        inst = self.get_institution()
        if not inst:
            return Response({'detail': 'No institution found'}, status=status.HTTP_404_NOT_FOUND)
        profile = self.get_user_profile()
        if profile.role not in ['PLATFORM_ADMIN', 'INSTITUTE_ADMIN']:
            return Response({'detail': 'Only administrators can update institution branding'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(inst, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(
            user=request.user,
            action="UPDATE_BRANDING",
            resource_type="Institution",
            resource_id=str(inst.id),
            details=f"Updated branding settings for {inst.name}",
            request=request
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def subscription_usage(self, request):
        inst = self.get_institution()
        if not inst:
            return Response({'detail': 'No institution found'}, status=status.HTTP_404_NOT_FOUND)
        usage = get_institution_usage(inst)
        return Response(usage)

    @action(detail=False, methods=['get'])
    def audit_logs(self, request):
        inst = self.get_institution()
        if not inst:
            return Response({'detail': 'No institution found'}, status=status.HTTP_404_NOT_FOUND)
        profile = self.get_user_profile()
        if profile.role not in ['PLATFORM_ADMIN', 'INSTITUTE_ADMIN']:
            return Response({'detail': 'Only administrators can inspect institutional audit logs'}, status=status.HTTP_403_FORBIDDEN)
        
        member_user_ids = inst.members.values_list('user_id', flat=True)
        logs = AuditLog.objects.filter(models.Q(user_id__in=member_user_ids) | models.Q(user__isnull=True)).order_by('-timestamp')[:50]
        
        logs_data = [{
            'id': l.id,
            'username': l.user.username if l.user else 'System',
            'action': l.action,
            'resource_type': l.resource_type,
            'resource_id': l.resource_id,
            'details': l.details,
            'ip_address': l.ip_address,
            'timestamp': l.timestamp.isoformat()
        } for l in logs]
        return Response(logs_data)


class BatchViewSet(BaseTenantViewSet):
    serializer_class = BatchSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return Batch.objects.none()
        return Batch.objects.filter(institution=inst)

    def perform_create(self, serializer):
        inst = self.get_institution()
        serializer.save(institution=inst)


class SubjectViewSet(BaseTenantViewSet):
    serializer_class = SubjectSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return Subject.objects.none()
        return Subject.objects.filter(institution=inst).prefetch_related('topics')

    def perform_create(self, serializer):
        inst = self.get_institution()
        serializer.save(institution=inst)

    @action(detail=True, methods=['post'])
    def add_topic(self, request, pk=None):
        subject = self.get_object()
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Topic name is required'}, status=status.HTTP_400_BAD_REQUEST)
        topic, _ = Topic.objects.get_or_create(subject=subject, name=name)
        return Response(TopicSerializer(topic).data, status=status.HTTP_201_CREATED)


class QuestionViewSet(BaseTenantViewSet):
    serializer_class = QuestionSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return Question.objects.none()
        
        qs = Question.objects.filter(institution=inst).select_related('subject', 'topic', 'created_by')
        
        # Filtering
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
            
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
            
        q_type = self.request.query_params.get('question_type')
        if q_type:
            qs = qs.filter(question_type=q_type)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(models.Q(question_text__icontains=search) | models.Q(explanation__icontains=search))
            
        return qs

    def perform_create(self, serializer):
        inst = self.get_institution()
        allowed, err_msg = check_question_quota(inst, 1)
        if not allowed:
            raise ValidationError({'detail': err_msg})
        q = serializer.save(institution=inst, created_by=self.request.user)
        log_audit_event(
            user=self.request.user,
            action="CREATE_QUESTION",
            resource_type="Question",
            resource_id=str(q.id),
            details=f"Created question in {q.subject.name} ({q.question_type})",
            request=self.request
        )

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        inst = self.get_institution()
        csv_file = request.FILES.get('file')
        csv_text = request.data.get('csv_text', '')
        
        if csv_file:
            csv_text = csv_file.read().decode('utf-8', errors='ignore')
            
        if not csv_text.strip():
            return Response({'detail': 'CSV content is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-check quota
        allowed, err_msg = check_question_quota(inst, 1)
        if not allowed:
            return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)
            
        result = bulk_import_questions(inst, request.user, csv_text)
        log_audit_event(
            user=request.user,
            action="BULK_IMPORT_QUESTIONS",
            resource_type="Question",
            resource_id="",
            details=f"Bulk imported {result.get('created_count', 0)} questions into {inst.name}",
            request=request
        )
        return Response(result)

    @action(detail=False, methods=['get'])
    def sample_csv(self, request):
        csv_content = (
            "subject_code,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation\n"
            "PHY,What is the SI unit of electric capacitance?,MCQ_SINGLE,EASY,Ohm,Farad,Henry,Volt,B,4.00,1.00,The SI unit of capacitance is Farad named after Michael Faraday.\n"
            "MTH,Find the limit as x approaches 0 of sin(x)/x,NUMERICAL,EASY,,,,,1.0,4.00,0.00,Standard trigonometric limit.\n"
            "CHEM,Which of the following are inert gases?,MCQ_MULTI,MEDIUM,Argon,Nitrogen,Helium,Chlorine,\"A,C\",4.00,1.00,Argon and Helium are Group 18 noble gases.\n"
        )
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sample_questions.csv"'
        return response


class ExamViewSet(BaseTenantViewSet):
    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return ExamDetailSerializer
        return ExamListSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return Exam.objects.none()
        qs = Exam.objects.filter(institution=inst).prefetch_related('exam_questions', 'batches', 'attempts')
        
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def perform_create(self, serializer):
        inst = self.get_institution()
        allowed, err_msg = check_exam_quota(inst)
        if not allowed:
            raise ValidationError({'detail': err_msg})
        exam = serializer.save(institution=inst, created_by=self.request.user)
        log_audit_event(
            user=self.request.user,
            action="CREATE_EXAM",
            resource_type="Exam",
            resource_id=str(exam.id),
            details=f"Created exam '{exam.title}' ({exam.code})",
            request=self.request
        )

    @action(detail=True, methods=['post'])
    def add_questions(self, request, pk=None):
        exam = self.get_object()
        question_ids = request.data.get('question_ids', [])
        marks = Decimal(str(request.data.get('marks', '4.00')))
        negative_marks = Decimal(str(request.data.get('negative_marks', '1.00')))
        
        current_count = exam.exam_questions.count()
        created = []
        for idx, qid in enumerate(question_ids, start=1):
            if not ExamQuestion.objects.filter(exam=exam, question_id=qid).exists():
                eq = ExamQuestion.objects.create(
                    exam=exam,
                    question_id=qid,
                    order=current_count + idx,
                    marks=marks,
                    negative_marks=negative_marks
                )
                created.append(eq.id)
                
        exam.recalculate_total_marks()
        return Response({'added_count': len(created), 'total_marks': float(exam.total_marks)})

    @action(detail=True, methods=['post'])
    def remove_question(self, request, pk=None):
        exam = self.get_object()
        question_id = request.data.get('question_id')
        ExamQuestion.objects.filter(exam=exam, question_id=question_id).delete()
        exam.recalculate_total_marks()
        return Response({'status': 'Question removed', 'total_marks': float(exam.total_marks)})

    @action(detail=True, methods=['post'])
    def publish_results(self, request, pk=None):
        exam = self.get_object()
        publish = request.data.get('publish', True)
        exam.results_published = publish
        exam.save(update_fields=['results_published'])
        
        if publish:
            # Auto-calculate ranks and percentiles upon publication
            calculate_ranks_and_percentiles(exam)

        log_audit_event(
            user=request.user,
            action="PUBLISH_RESULTS" if publish else "UNPUBLISH_RESULTS",
            resource_type="Exam",
            resource_id=str(exam.id),
            details=f"{'Published' if publish else 'Hidden'} results and rankings for exam {exam.code}",
            request=request
        )
            
        return Response({
            'status': 'Results published' if publish else 'Results hidden',
            'results_published': exam.results_published
        })

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        exam = self.get_object()
        data = get_exam_analytics(exam)
        return Response(data)

    @action(detail=True, methods=['post'])
    def recalculate_ranks(self, request, pk=None):
        exam = self.get_object()
        calculate_ranks_and_percentiles(exam)
        return Response({'status': 'Ranks and percentiles recalculated successfully'})

    @action(detail=True, methods=['get'])
    def export_results_csv(self, request, pk=None):
        exam = self.get_object()
        attempts = exam.attempts.filter(status__in=['EVALUATED', 'SUBMITTED', 'TIMED_OUT']).order_by('rank', '-total_score')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{exam.code}_results.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Rank', 'Roll Number', 'Student Name', 'Username', 'Score', 'Max Score', 'Percentage', 'Percentile', 'Accuracy %', 'Time Spent (s)', 'Status'])
        
        for att in attempts:
            roll = getattr(att.student, 'profile', None).roll_number if hasattr(att.student, 'profile') else ''
            writer.writerow([
                att.rank or '-',
                roll,
                att.student.get_full_name() or att.student.username,
                att.student.username,
                float(att.total_score),
                float(att.max_possible_score),
                float(att.percentage),
                float(att.percentile),
                float(att.accuracy_rate),
                att.time_spent_seconds,
                att.status
            ])
        return response

    @action(detail=True, methods=['get'])
    def printable_merit_list(self, request, pk=None):
        """Renders an official print-ready master merit list / rank sheet."""
        exam = self.get_object()
        html_content = generate_printable_merit_list_html(exam)
        return HttpResponse(html_content, content_type='text/html')

    @action(detail=True, methods=['get'])
    def student_scorecard(self, request, pk=None):
        """Renders print-ready scorecard for any student attempt."""
        exam = self.get_object()
        attempt_id = request.query_params.get('attempt_id')
        student_id = request.query_params.get('student_id')
        
        if attempt_id:
            attempt = get_object_or_404(ExamAttempt, id=attempt_id, exam=exam)
        elif student_id:
            attempt = ExamAttempt.objects.filter(exam=exam, student_id=student_id).order_by('-attempt_number').first()
            if not attempt:
                return Response({'detail': 'No attempt found for candidate'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'detail': 'attempt_id or student_id required'}, status=status.HTTP_400_BAD_REQUEST)
            
        html_content = generate_printable_scorecard_html(attempt)
        return HttpResponse(html_content, content_type='text/html')

    @action(detail=True, methods=['get'])
    def proctoring_report(self, request, pk=None):
        """Returns comprehensive proctoring analytics, flagged candidates, and event timelines."""
        exam = self.get_object()
        attempts = exam.attempts.select_related('student', 'student__profile').prefetch_related('proctoring_events').order_by('-is_flagged_for_cheating', '-warning_count')
        
        report_items = []
        flagged_count = 0
        total_warnings = 0
        for a in attempts:
            if a.is_flagged_for_cheating:
                flagged_count += 1
            total_warnings += a.warning_count
            
            events = [{
                'id': str(e.id),
                'event_type': e.event_type,
                'severity': e.severity,
                'details': e.details,
                'created_at': e.created_at.isoformat()
            } for e in a.proctoring_events.all()[:20]]

            report_items.append({
                'attempt_id': str(a.id),
                'student_id': a.student.id,
                'student_name': a.student.get_full_name() or a.student.username,
                'username': a.student.username,
                'roll_number': getattr(a.student, 'profile', None).roll_number if hasattr(a.student, 'profile') else '',
                'status': a.status,
                'tab_switch_count': a.tab_switch_count,
                'warning_count': a.warning_count,
                'fullscreen_exit_count': a.fullscreen_exit_count,
                'copy_paste_count': a.copy_paste_count,
                'proctoring_score': float(a.proctoring_score),
                'is_flagged': a.is_flagged_for_cheating,
                'flag_reason': a.flag_reason,
                'events_count': a.proctoring_events.count(),
                'recent_events': events
            })

        return Response({
            'exam_id': exam.id,
            'exam_title': exam.title,
            'exam_code': exam.code,
            'total_candidates': len(report_items),
            'flagged_candidates_count': flagged_count,
            'total_warnings_issued': total_warnings,
            'attempts': report_items
        })

    @action(detail=True, methods=['post'])
    def reset_student_attempt(self, request, pk=None):
        """Cancels a student attempt to allow immediate retake."""
        exam = self.get_object()
        student_id = request.data.get('student_id')
        attempt_id = request.data.get('attempt_id')
        reason = request.data.get('reason', 'Educator administrative reset / hardware glitch')
        
        if attempt_id:
            attempt = get_object_or_404(ExamAttempt, id=attempt_id, exam=exam)
        elif student_id:
            attempt = ExamAttempt.objects.filter(exam=exam, student_id=student_id).order_by('-attempt_number').first()
            if not attempt:
                return Response({'detail': 'No attempt found to reset'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'detail': 'student_id or attempt_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        student_user = attempt.student
        attempt.status = 'CANCELLED'
        attempt.save(update_fields=['status'])
        
        log_audit_event(
            user=request.user,
            action="RESET_ATTEMPT",
            resource_type="ExamAttempt",
            resource_id=str(attempt.id),
            details=f"Cancelled attempt #{attempt.attempt_number} for student {student_user.username} on exam {exam.code}. Reason: {reason}",
            request=request
        )
        
        return Response({
            'status': 'Attempt reset successfully',
            'attempt_id': str(attempt.id),
            'student_username': student_user.username,
            'message': f"Attempt for {student_user.username} was marked CANCELLED. Student can now re-take the exam."
        })

    @action(detail=True, methods=['post'])
    def grant_reattempt(self, request, pk=None):
        """Grants an individual student additional attempts without changing global exam limits."""
        exam = self.get_object()
        student_id = request.data.get('student_id')
        extra_attempts = int(request.data.get('extra_attempts', 1))
        reason = request.data.get('reason', 'Educator granted retake permission')
        
        if not student_id:
            return Response({'detail': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        student = get_object_or_404(User, id=student_id)
        override, created = ExamStudentOverride.objects.get_or_create(
            exam=exam,
            student=student,
            defaults={
                'extra_attempts': extra_attempts,
                'reason': reason,
                'granted_by': request.user
            }
        )
        if not created:
            override.extra_attempts += extra_attempts
            override.reason = reason
            override.granted_by = request.user
            override.save()

        log_audit_event(
            user=request.user,
            action="GRANT_REATTEMPT",
            resource_type="ExamStudentOverride",
            resource_id=str(override.id),
            details=f"Granted +{extra_attempts} attempt(s) to student {student.username} for exam {exam.code}. Reason: {reason}",
            request=request
        )

        return Response({
            'status': 'Retake permission granted',
            'student_username': student.username,
            'total_extra_attempts': override.extra_attempts,
            'reason': override.reason
        })


class StudentExamViewSet(viewsets.ViewSet):
    """
    Dedicated endpoints for students:
    - View assigned exams
    - Start live attempt (with strict countdown timer)
    - Auto-save question answers in real time
    - Submit attempt (or auto-submit on timer expiry)
    - View scorecard, rank, and solutions (when published)
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def available_exams(self, request):
        user = request.user
        profile = get_user_profile(user)
        inst = profile.institution
        
        if not inst:
            return Response([])

        now = timezone.now()
        # Find exams for student's batch or exams assigned to no specific batch (all institute students)
        qs = Exam.objects.filter(institution=inst).exclude(status__in=['DRAFT', 'ARCHIVED'])
        if profile.batch:
            qs = qs.filter(models.Q(batches=profile.batch) | models.Q(batches__isnull=True)).distinct()

        results = []
        for exam in qs:
            attempts = ExamAttempt.objects.filter(exam=exam, student=user)
            latest_attempt = attempts.order_by('-attempt_number').first()
            
            # Determine state
            if latest_attempt and latest_attempt.status in ['SUBMITTED', 'TIMED_OUT', 'EVALUATED']:
                state = 'COMPLETED'
            elif latest_attempt and latest_attempt.status == 'IN_PROGRESS':
                state = 'IN_PROGRESS'
            elif now < exam.start_time:
                state = 'UPCOMING'
            elif exam.end_time and now > exam.end_time:
                state = 'EXPIRED'
            else:
                state = 'AVAILABLE'

            results.append({
                'id': exam.id,
                'title': exam.title,
                'code': exam.code,
                'description': exam.description,
                'duration_minutes': exam.duration_minutes,
                'total_marks': float(exam.total_marks),
                'passing_percentage': float(exam.passing_percentage),
                'enable_negative_marking': exam.enable_negative_marking,
                'start_time': exam.start_time.isoformat(),
                'end_time': exam.end_time.isoformat() if exam.end_time else None,
                'status': state,
                'results_published': exam.results_published,
                'latest_attempt_id': str(latest_attempt.id) if latest_attempt else None,
                'latest_attempt_score': float(latest_attempt.total_score) if (latest_attempt and exam.results_published) else None,
                'latest_attempt_rank': latest_attempt.rank if (latest_attempt and exam.results_published) else None,
            })

        return Response(results)

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        exam = get_object_or_404(Exam, pk=pk)
        user = request.user
        profile = get_user_profile(user)

        # Check existing in-progress attempt
        in_progress = ExamAttempt.objects.filter(exam=exam, student=user, status='IN_PROGRESS').first()
        if in_progress:
            # Check if expired
            now = timezone.now()
            if now > in_progress.expires_at:
                in_progress.status = 'TIMED_OUT'
                in_progress.submitted_at = in_progress.expires_at
                in_progress.save()
                in_progress.evaluate_and_grade()
                calculate_ranks_and_percentiles(exam)
            else:
                seconds_left = max(0, int((in_progress.expires_at - now).total_seconds()))
                return self._build_live_exam_payload(in_progress, seconds_left)

        # Check max attempts limit (factoring in individual educator retake overrides)
        override = ExamStudentOverride.objects.filter(exam=exam, student=user).first()
        effective_max = exam.max_attempts + (override.extra_attempts if override else 0)

        completed_count = ExamAttempt.objects.filter(
            exam=exam, student=user, status__in=['SUBMITTED', 'TIMED_OUT', 'EVALUATED']
        ).count()
        if not exam.allow_multiple_attempts and completed_count >= effective_max:
            return Response(
                {'detail': 'You have already reached the maximum attempts for this examination.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new attempt
        now = timezone.now()
        expires = now + timedelta(minutes=exam.duration_minutes)
        if exam.end_time and expires > exam.end_time:
            expires = exam.end_time

        # Retrieve questions
        exam_questions = list(exam.exam_questions.select_related('question').order_by('order'))
        if exam.shuffle_questions:
            import random
            random.shuffle(exam_questions)
            
        q_order_ids = [eq.question_id for eq in exam_questions]

        attempt = ExamAttempt.objects.create(
            exam=exam,
            student=user,
            attempt_number=completed_count + 1,
            started_at=now,
            expires_at=expires,
            status='IN_PROGRESS',
            questions_order=q_order_ids,
            ip_address=request.META.get('REMOTE_ADDR', '')
        )

        # Initialize student answers in NOT_VISITED status
        for eq in exam_questions:
            StudentAnswer.objects.create(
                attempt=attempt,
                question=eq.question,
                status='NOT_VISITED'
            )

        seconds_left = int((expires - now).total_seconds())
        return self._build_live_exam_payload(attempt, seconds_left)

    def _build_live_exam_payload(self, attempt, seconds_left):
        exam = attempt.exam
        answers_dict = {ans.question_id: ans for ans in attempt.answers.all()}
        
        # Load questions in deterministic sequence saved on attempt
        q_order = attempt.questions_order
        questions = Question.objects.filter(id__in=q_order).select_related('subject')
        questions_map = {q.id: q for q in questions}
        
        exam_questions_map = {eq.question_id: eq for eq in exam.exam_questions.all()}

        questions_payload = []
        for idx, qid in enumerate(q_order, start=1):
            q = questions_map.get(qid)
            if not q:
                continue
            eq = exam_questions_map.get(qid)
            ans = answers_dict.get(qid)

            questions_payload.append({
                'order': idx,
                'question_id': q.id,
                'subject_name': q.subject.name,
                'subject_code': q.subject.code,
                'question_text': q.question_text,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'marks': float(eq.marks) if eq else 4.0,
                'negative_marks': float(eq.negative_marks) if eq else 1.0,
                'options': q.options,
                'tags': q.tags,
                'student_answer': {
                    'selected_options': ans.selected_options if ans else [],
                    'numerical_value': ans.numerical_value if ans else None,
                    'text_value': ans.text_value if ans else "",
                    'is_marked_for_review': ans.is_marked_for_review if ans else False,
                    'status': ans.status if ans else 'NOT_VISITED',
                }
            })

        return Response({
            'attempt_id': str(attempt.id),
            'exam_id': exam.id,
            'exam_title': exam.title,
            'exam_code': exam.code,
            'duration_minutes': exam.duration_minutes,
            'seconds_remaining': seconds_left,
            'enable_negative_marking': exam.enable_negative_marking,
            'total_questions': len(questions_payload),
            'questions': questions_payload,
        })

    @action(detail=False, methods=['post'])
    def save_answer(self, request):
        attempt_id = request.data.get('attempt_id')
        question_id = request.data.get('question_id')
        selected_options = request.data.get('selected_options', [])
        numerical_value = request.data.get('numerical_value')
        text_value = request.data.get('text_value', '')
        review_val = request.data.get('is_marked_for_review', False)
        if isinstance(review_val, str):
            is_marked_for_review = review_val.strip().lower() in ['true', '1', 'yes']
        else:
            is_marked_for_review = bool(review_val)
        time_spent_delta = int(request.data.get('time_spent_delta', 0))

        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=request.user)
        if attempt.status != 'IN_PROGRESS':
            return Response({'detail': 'Attempt is no longer in progress'}, status=status.HTTP_400_BAD_REQUEST)

        # Check timer expiry
        if timezone.now() > attempt.expires_at:
            attempt.status = 'TIMED_OUT'
            attempt.submitted_at = attempt.expires_at
            attempt.save()
            attempt.evaluate_and_grade()
            calculate_ranks_and_percentiles(attempt.exam)
            return Response({'detail': 'Exam time has expired! Submitted automatically.'}, status=status.HTTP_408_REQUEST_TIMEOUT)

        ans, _ = StudentAnswer.objects.get_or_create(attempt=attempt, question_id=question_id)
        ans.selected_options = selected_options
        ans.numerical_value = str(numerical_value) if numerical_value is not None else None
        ans.text_value = text_value
        ans.is_marked_for_review = is_marked_for_review
        ans.time_spent_seconds += time_spent_delta

        # Determine CBT 5-state status
        has_val = bool(selected_options or (numerical_value is not None and str(numerical_value).strip() != "") or text_value.strip())
        if has_val and is_marked_for_review:
            ans.status = 'ANSWERED_AND_MARKED_FOR_REVIEW'
        elif has_val:
            ans.status = 'ANSWERED'
        elif is_marked_for_review:
            ans.status = 'MARKED_FOR_REVIEW'
        else:
            ans.status = 'VISITED_UNANSWERED'

        ans.save()
        return Response({'status': ans.status, 'saved': True})

    @action(detail=False, methods=['post'])
    def submit_attempt(self, request):
        attempt_id = request.data.get('attempt_id')
        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=request.user)
        
        if attempt.status not in ['IN_PROGRESS']:
            return Response({'detail': 'Attempt has already been submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        attempt.submitted_at = now
        attempt.time_spent_seconds = int((now - attempt.started_at).total_seconds())
        attempt.status = 'SUBMITTED'
        attempt.save()

        # Execute automated grading engine
        attempt.evaluate_and_grade()
        # Recalculate rank and percentile
        calculate_ranks_and_percentiles(attempt.exam)

        return Response({
            'message': 'Exam submitted successfully!',
            'attempt_id': str(attempt.id),
            'total_score': float(attempt.total_score),
            'accuracy_rate': float(attempt.accuracy_rate),
            'results_published': attempt.exam.results_published
        })

    @action(detail=False, methods=['get'])
    def scorecard(self, request):
        attempt_id = request.query_params.get('attempt_id')
        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=request.user)
        data = get_student_scorecard(attempt)
        return Response(data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        user = request.user
        attempts = ExamAttempt.objects.filter(student=user).select_related('exam').order_by('-started_at')
        serializer = ExamAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def log_telemetry(self, request):
        """
        Receives live student browser telemetry: tab switches, window blur,
        fullscreen exit, devtools detection, and copy-paste actions.
        """
        attempt_id = request.data.get('attempt_id')
        event_type = request.data.get('event_type')
        details = request.data.get('details', {})
        client_timestamp = request.data.get('client_timestamp')

        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=request.user)
        if attempt.status != 'IN_PROGRESS':
            return Response({'detail': 'Attempt is not active'}, status=status.HTTP_400_BAD_REQUEST)

        severity = 'WARNING'
        if event_type in ['DEVTOOLS_OPEN', 'IP_CHANGE']:
            severity = 'CRITICAL'
        elif event_type == 'HEARTBEAT':
            severity = 'INFO'

        ProctoringEvent.objects.create(
            attempt=attempt,
            event_type=event_type,
            severity=severity,
            details=details if isinstance(details, dict) else {'raw': str(details)},
            client_timestamp=client_timestamp or timezone.now()
        )

        # Update attempt counters
        if event_type == 'TAB_SWITCH':
            attempt.tab_switch_count += 1
            attempt.warning_count += 1
        elif event_type == 'FULLSCREEN_EXIT':
            attempt.fullscreen_exit_count += 1
            attempt.warning_count += 1
        elif event_type == 'COPY_PASTE':
            attempt.copy_paste_count += 1
            attempt.warning_count += 1
        elif event_type == 'DEVTOOLS_OPEN':
            attempt.warning_count += 2
            attempt.is_flagged_for_cheating = True
            attempt.flag_reason = "Developer tools detected during examination session"

        # Compute proctoring score
        penalty = (attempt.tab_switch_count * 15) + (attempt.fullscreen_exit_count * 20) + (attempt.copy_paste_count * 25)
        attempt.proctoring_score = max(Decimal('0.00'), Decimal('100.00') - Decimal(penalty))

        # Flag for cheating if threshold reached (3 tab switches or 4 warnings)
        if (attempt.tab_switch_count >= 3 or attempt.warning_count >= 4) and not attempt.is_flagged_for_cheating:
            attempt.is_flagged_for_cheating = True
            attempt.flag_reason = f"Excessive browser anomalies ({attempt.tab_switch_count} tab switches recorded)"

        attempt.save(update_fields=[
            'tab_switch_count', 'fullscreen_exit_count', 'copy_paste_count',
            'warning_count', 'proctoring_score', 'is_flagged_for_cheating', 'flag_reason'
        ])

        return Response({
            'status': 'recorded',
            'event_type': event_type,
            'tab_switch_count': attempt.tab_switch_count,
            'fullscreen_exit_count': attempt.fullscreen_exit_count,
            'copy_paste_count': attempt.copy_paste_count,
            'warning_count': attempt.warning_count,
            'proctoring_score': float(attempt.proctoring_score),
            'is_flagged': attempt.is_flagged_for_cheating,
            'flag_reason': attempt.flag_reason,
            'max_allowed_warnings': 3,
            'remaining_warnings': max(0, 3 - attempt.tab_switch_count)
        })

    @action(detail=False, methods=['get'])
    def printable_scorecard(self, request):
        """Returns official print-ready HTML scorecard for the authenticated student."""
        attempt_id = request.query_params.get('attempt_id')
        attempt = get_object_or_404(ExamAttempt, id=attempt_id, student=request.user)
        html_content = generate_printable_scorecard_html(attempt)
        return HttpResponse(html_content, content_type='text/html')


class StudentManagementViewSet(BaseTenantViewSet):
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return UserProfile.objects.none()
        return UserProfile.objects.filter(institution=inst, role='STUDENT').select_related('user', 'batch')

    @action(detail=False, methods=['post'])
    def enroll_student(self, request):
        inst = self.get_institution()
        
        # Check student enrollment quota
        allowed, err_msg = check_student_quota(inst, 1)
        if not allowed:
            return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', 'StudentPass123!').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        roll_number = data.get('roll_number', '').strip()
        batch_id = data.get('batch_id')
        phone = data.get('phone', '').strip()

        if not username:
            return Response({'detail': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        batch = None
        if batch_id:
            batch = Batch.objects.filter(id=batch_id, institution=inst).first()

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
        )

        profile = UserProfile.objects.create(
            user=user,
            institution=inst,
            role='STUDENT',
            phone=phone,
            roll_number=roll_number or f"STU-{user.id:04d}",
            batch=batch
        )

        log_audit_event(
            user=request.user,
            action="ENROLL_STUDENT",
            resource_type="UserProfile",
            resource_id=str(profile.id),
            details=f"Enrolled student {username} (Roll: {profile.roll_number}) in {inst.name}",
            request=request
        )

        return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        inst = self.get_institution()
        
        # Pre-check student quota
        allowed, err_msg = check_student_quota(inst, 1)
        if not allowed:
            return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        csv_file = request.FILES.get('file')
        csv_text = request.data.get('csv_text', '')
        
        if csv_file:
            csv_text = csv_file.read().decode('utf-8', errors='ignore')
            
        if not csv_text.strip():
            return Response({'detail': 'CSV content is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        result = bulk_import_students(inst, csv_text)

        log_audit_event(
            user=request.user,
            action="BULK_IMPORT_STUDENTS",
            resource_type="UserProfile",
            resource_id="",
            details=f"Bulk imported {result.get('created_count', 0)} students into {inst.name}",
            request=request
        )

        return Response(result)

    @action(detail=False, methods=['get'])
    def sample_csv(self, request):
        csv_content = (
            "username,email,first_name,last_name,password,roll_number,batch_code,phone\n"
            "rahul_kumar,rahul@example.com,Rahul,Kumar,StudentPass123!,JEE26-001,BATCH-A,9876543210\n"
            "priya_sharma,priya@example.com,Priya,Sharma,StudentPass123!,JEE26-002,BATCH-A,9876543211\n"
            "amit_verma,amit@example.com,Amit,Verma,StudentPass123!,JEE26-003,BATCH-B,9876543212\n"
        )
        response = HttpResponse(csv_content, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="sample_students.csv"'
        return response


class AnnouncementViewSet(BaseTenantViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        inst = self.get_institution()
        if not inst:
            return Announcement.objects.none()
        profile = self.get_user_profile()
        qs = Announcement.objects.filter(institution=inst, is_published=True)
        if profile.role == 'STUDENT' and profile.batch:
            qs = qs.filter(models.Q(target_batches=profile.batch) | models.Q(target_batches__isnull=True)).distinct()
        return qs

    def perform_create(self, serializer):
        inst = self.get_institution()
        serializer.save(institution=inst, created_by=self.request.user)


class DashboardStatsView(APIView):
    """
    Unified dashboard metrics for Educators and Students.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = get_user_profile(user)
        inst = profile.institution

        if not inst:
            return Response({'error': 'No institution found for user'}, status=status.HTTP_404_NOT_FOUND)

        is_educator = profile.role in ['PLATFORM_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER']

        if is_educator:
            total_students = inst.members.filter(role='STUDENT').count()
            total_batches = inst.batches.count()
            total_questions = inst.questions.count()
            total_exams = inst.exams.count()
            active_exams = inst.exams.filter(status='LIVE').count()
            
            # Submissions today
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_submissions = ExamAttempt.objects.filter(
                exam__institution=inst,
                submitted_at__gte=today_start
            ).count()

            # Recent exam attempts
            recent_attempts = ExamAttempt.objects.filter(exam__institution=inst).select_related('exam', 'student').order_by('-created_at')[:6]
            recent_attempts_data = [{
                'id': str(a.id),
                'student_name': a.student.get_full_name() or a.student.username,
                'exam_title': a.exam.title,
                'score': float(a.total_score),
                'status': a.status,
                'time_spent_seconds': a.time_spent_seconds,
                'created_at': a.created_at.isoformat()
            } for a in recent_attempts]

            return Response({
                'role': profile.role,
                'institution': {
                    'name': inst.name,
                    'code': inst.code,
                    'tier': inst.subscription_tier,
                    'primary_color': inst.primary_color,
                    'tagline': inst.tagline
                },
                'total_students': total_students,
                'total_batches': total_batches,
                'total_questions': total_questions,
                'total_exams': total_exams,
                'active_exams': active_exams,
                'today_submissions': today_submissions,
                'recent_attempts': recent_attempts_data,
            })
        else:
            # Student stats
            attempts = ExamAttempt.objects.filter(student=user, status__in=['SUBMITTED', 'TIMED_OUT', 'EVALUATED'])
            total_completed = attempts.count()
            avg_score = attempts.aggregate(models.Avg('percentage'))['percentage__avg'] or 0.0
            best_rank = attempts.aggregate(models.Min('rank'))['rank__min']

            upcoming_exams = Exam.objects.filter(institution=inst, status='SCHEDULED').count()
            available_exams = Exam.objects.filter(institution=inst, status='LIVE').count()

            return Response({
                'role': 'STUDENT',
                'student_name': user.get_full_name() or user.username,
                'roll_number': profile.roll_number,
                'batch_name': profile.batch.name if profile.batch else 'General',
                'institution': {
                    'name': inst.name,
                    'code': inst.code,
                    'tagline': inst.tagline
                },
                'total_completed': total_completed,
                'average_score_pct': round(float(avg_score), 1),
                'best_rank': best_rank,
                'upcoming_exams_count': upcoming_exams,
                'available_exams_count': available_exams,
            })
