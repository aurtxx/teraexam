import csv
import io
from decimal import Decimal
from django.db import models, transaction
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Institution, Batch, UserProfile, Subject, Topic, Question,
    Exam, ExamQuestion, ExamAttempt, StudentAnswer
)


def calculate_ranks_and_percentiles(exam):
    """
    Recalculates Rank and NTA/JEE Percentile scores for all evaluated attempts in an exam.
    Rank sorting:
    1. Highest total_score (descending)
    2. Lower time_spent_seconds (ascending tie-breaker)
    3. More correct_count (descending tie-breaker)
    
    Percentile formula:
    Percentile = (Number of candidates who scored <= candidate's score / Total candidates) * 100
    """
    attempts = list(
        ExamAttempt.objects.filter(
            exam=exam,
            status__in=['EVALUATED', 'SUBMITTED', 'TIMED_OUT']
        ).order_by('-total_score', 'time_spent_seconds', '-correct_count')
    )
    
    total_candidates = len(attempts)
    if total_candidates == 0:
        return

    # Sort attempts
    current_rank = 1
    for index, attempt in enumerate(attempts):
        if index > 0:
            prev = attempts[index - 1]
            if (attempt.total_score == prev.total_score and 
                attempt.time_spent_seconds == prev.time_spent_seconds and
                attempt.correct_count == prev.correct_count):
                attempt.rank = prev.rank
            else:
                attempt.rank = index + 1
        else:
            attempt.rank = 1

        # Percentile: count how many candidates scored <= this attempt's total_score
        scored_less_or_equal = sum(1 for a in attempts if a.total_score <= attempt.total_score)
        percentile = (Decimal(scored_less_or_equal) / Decimal(total_candidates)) * Decimal('100.00')
        attempt.percentile = round(percentile, 2)
        
        attempt.save(update_fields=['rank', 'percentile'])


def get_exam_analytics(exam):
    """
    Generates rich statistical and diagnostic analytics for an educator's exam.
    """
    attempts = ExamAttempt.objects.filter(
        exam=exam,
        status__in=['EVALUATED', 'SUBMITTED', 'TIMED_OUT']
    )
    total_attempts = attempts.count()
    
    if total_attempts == 0:
        return {
            'total_attempts': 0,
            'average_score': 0.0,
            'highest_score': 0.0,
            'lowest_score': 0.0,
            'average_accuracy': 0.0,
            'pass_percentage_actual': 0.0,
            'leaderboard': [],
            'question_stats': [],
        }

    stats = attempts.aggregate(
        avg_score=models.Avg('total_score'),
        max_score=models.Max('total_score'),
        min_score=models.Min('total_score'),
        avg_accuracy=models.Avg('accuracy_rate'),
    )

    passing_mark = (exam.total_marks * exam.passing_percentage) / Decimal('100.00')
    passed_count = attempts.filter(total_score__gte=passing_mark).count()
    pass_pct = round((Decimal(passed_count) / Decimal(total_attempts) * 100), 2)

    # Leaderboard (Top 10)
    top_attempts = attempts.order_by('rank', '-total_score')[:10]
    leaderboard = []
    for att in top_attempts:
        leaderboard.append({
            'attempt_id': att.id,
            'student_id': att.student.id,
            'rank': att.rank,
            'student_name': att.student.get_full_name() or att.student.username,
            'username': att.student.username,
            'roll_number': getattr(att.student, 'profile', None).roll_number if hasattr(att.student, 'profile') else '',
            'score': float(att.total_score),
            'max_score': float(att.max_possible_score),
            'percentage': float(att.percentage),
            'percentile': float(att.percentile),
            'accuracy': float(att.accuracy_rate),
            'time_spent_seconds': att.time_spent_seconds,
        })

    # Question Performance Stats (Item Analysis / Discrimination)
    exam_questions = exam.exam_questions.select_related('question', 'question__subject').order_by('order')
    question_stats = []
    
    for eq in exam_questions:
        q = eq.question
        answers = StudentAnswer.objects.filter(attempt__in=attempts, question=q)
        total_answers = answers.count()
        correct_answers = answers.filter(is_correct=True).count()
        accuracy = round((correct_answers / total_answers * 100), 1) if total_answers > 0 else 0.0
        
        question_stats.append({
            'order': eq.order,
            'question_id': q.id,
            'subject': q.subject.name,
            'question_text': q.question_text[:80] + ("..." if len(q.question_text) > 80 else ""),
            'type': q.question_type,
            'difficulty': q.difficulty,
            'marks': float(eq.marks),
            'attempt_count': total_answers,
            'correct_count': correct_answers,
            'accuracy_percentage': accuracy,
        })

    return {
        'total_attempts': total_attempts,
        'average_score': round(float(stats['avg_score'] or 0.0), 2),
        'highest_score': round(float(stats['max_score'] or 0.0), 2),
        'lowest_score': round(float(stats['min_score'] or 0.0), 2),
        'average_accuracy': round(float(stats['avg_accuracy'] or 0.0), 2),
        'pass_percentage_actual': float(pass_pct),
        'passing_mark': float(passing_mark),
        'leaderboard': leaderboard,
        'question_stats': question_stats,
    }


def get_student_scorecard(attempt):
    """
    Generates detailed student scorecard with subject breakdown and full question answers.
    """
    exam = attempt.exam
    is_published = exam.results_published or exam.show_solutions_after_submit

    exam_questions = exam.exam_questions.select_related('question', 'question__subject').order_by('order')
    answers_map = {ans.question_id: ans for ans in attempt.answers.select_related('question')}

    questions_review = []
    subject_breakdown = {}

    for eq in exam_questions:
        q = eq.question
        sub_name = q.subject.name
        if sub_name not in subject_breakdown:
            subject_breakdown[sub_name] = {
                'subject': sub_name,
                'total_questions': 0,
                'attempted': 0,
                'correct': 0,
                'score': Decimal('0.00'),
                'max_score': Decimal('0.00'),
            }
        
        subject_breakdown[sub_name]['total_questions'] += 1
        subject_breakdown[sub_name]['max_score'] += eq.marks

        ans = answers_map.get(q.id)
        status = ans.status if ans else 'NOT_VISITED'
        marks_awarded = ans.marks_awarded if ans else Decimal('0.00')
        is_correct = ans.is_correct if ans else False

        if ans and status in ['ANSWERED', 'ANSWERED_AND_MARKED_FOR_REVIEW']:
            subject_breakdown[sub_name]['attempted'] += 1
            if is_correct:
                subject_breakdown[sub_name]['correct'] += 1
            subject_breakdown[sub_name]['score'] += marks_awarded

        item = {
            'order': eq.order,
            'question_id': q.id,
            'subject': sub_name,
            'question_text': q.question_text,
            'question_type': q.question_type,
            'difficulty': q.difficulty,
            'marks': float(eq.marks),
            'negative_marks': float(eq.negative_marks),
            'status': status,
            'student_selected_options': ans.selected_options if ans else [],
            'student_numerical_value': ans.numerical_value if ans else None,
            'student_text_value': ans.text_value if ans else "",
            'marks_awarded': float(marks_awarded),
            'is_correct': is_correct,
            'options': q.options,
        }

        # Include correct keys and explanations if published
        if is_published:
            item['correct_answers'] = q.correct_answers
            item['explanation'] = q.explanation
        else:
            item['correct_answers'] = None
            item['explanation'] = "Explanations will be made available when results are published by the educator."

        questions_review.append(item)

    # Format subject breakdown
    breakdown_list = []
    for sub, data in subject_breakdown.items():
        breakdown_list.append({
            'subject': sub,
            'total_questions': data['total_questions'],
            'attempted': data['attempted'],
            'correct': data['correct'],
            'score': float(data['score']),
            'max_score': float(data['max_score']),
            'percentage': round(float((data['score'] / data['max_score'] * 100) if data['max_score'] > 0 else 0), 1),
        })

    return {
        'attempt_id': str(attempt.id),
        'exam_title': exam.title,
        'exam_code': exam.code,
        'results_published': exam.results_published,
        'student_name': attempt.student.get_full_name() or attempt.student.username,
        'roll_number': getattr(attempt.student, 'profile', None).roll_number if hasattr(attempt.student, 'profile') else '',
        'total_score': float(attempt.total_score),
        'max_possible_score': float(attempt.max_possible_score),
        'percentage': float(attempt.percentage),
        'rank': attempt.rank,
        'percentile': float(attempt.percentile),
        'accuracy_rate': float(attempt.accuracy_rate),
        'correct_count': attempt.correct_count,
        'incorrect_count': attempt.incorrect_count,
        'unattempted_count': attempt.unattempted_count,
        'time_spent_seconds': attempt.time_spent_seconds,
        'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        'subject_breakdown': breakdown_list,
        'questions_review': questions_review,
    }


def bulk_import_questions(institution, user, csv_text):
    """
    Parses CSV content and imports questions into the institution's question bank.
    Expected CSV columns:
    subject_code,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
    """
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    created_count = 0
    errors = []

    with transaction.atomic():
        for row_idx, row in enumerate(reader, start=1):
            try:
                sub_code = row.get('subject_code', '').strip()
                q_text = row.get('question_text', '').strip()
                q_type = row.get('question_type', 'MCQ_SINGLE').strip().upper()
                difficulty = row.get('difficulty', 'MEDIUM').strip().upper()
                correct_ans_str = row.get('correct_answer', '').strip()
                marks_str = row.get('marks', '4.00').strip()
                neg_marks_str = row.get('negative_marks', '1.00').strip()
                explanation = row.get('explanation', '').strip()

                if not sub_code or not q_text or not correct_ans_str:
                    errors.append(f"Row {row_idx}: Missing required fields (subject_code, question_text, correct_answer)")
                    continue

                # Find or create subject
                subject, _ = Subject.objects.get_or_create(
                    institution=institution,
                    code=sub_code.upper(),
                    defaults={'name': sub_code.upper(), 'description': f'{sub_code.upper()} Subject'}
                )

                # Format options
                options = []
                for opt_key in ['option_a', 'option_b', 'option_c', 'option_d']:
                    val = row.get(opt_key, '').strip()
                    if val:
                        opt_id = opt_key.split('_')[1].upper()
                        options.append({'id': opt_id, 'text': val})

                # Format correct answer
                if q_type == 'NUMERICAL':
                    correct_answers = {'value': float(correct_ans_str), 'tolerance': 0.05}
                elif q_type in ['MCQ_SINGLE', 'TRUE_FALSE', 'SHORT_ANSWER']:
                    correct_answers = [correct_ans_str.upper() if q_type != 'SHORT_ANSWER' else correct_ans_str]
                elif q_type == 'MCQ_MULTI':
                    correct_answers = [x.strip().upper() for x in correct_ans_str.split(',') if x.strip()]
                else:
                    correct_answers = [correct_ans_str]

                Question.objects.create(
                    institution=institution,
                    subject=subject,
                    question_text=q_text,
                    question_type=q_type,
                    difficulty=difficulty if difficulty in ['EASY', 'MEDIUM', 'HARD'] else 'MEDIUM',
                    options=options,
                    correct_answers=correct_answers,
                    explanation=explanation,
                    default_marks=Decimal(marks_str),
                    default_negative_marks=Decimal(neg_marks_str),
                    created_by=user,
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Row {row_idx}: Error parsing line - {str(e)}")

    return {'created_count': created_count, 'errors': errors}


def bulk_import_students(institution, csv_text):
    """
    Parses CSV content and imports students into the institution.
    Expected CSV columns:
    username,email,first_name,last_name,password,roll_number,batch_code,phone
    """
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    created_count = 0
    errors = []

    with transaction.atomic():
        for row_idx, row in enumerate(reader, start=1):
            try:
                username = row.get('username', '').strip()
                email = row.get('email', '').strip()
                first_name = row.get('first_name', '').strip()
                last_name = row.get('last_name', '').strip()
                password = row.get('password', 'StudentPass123!').strip()
                roll_number = row.get('roll_number', '').strip()
                batch_code = row.get('batch_code', '').strip()
                phone = row.get('phone', '').strip()

                if not username:
                    errors.append(f"Row {row_idx}: Missing username")
                    continue

                if User.objects.filter(username=username).exists():
                    errors.append(f"Row {row_idx}: Username '{username}' already exists")
                    continue

                # Batch lookup
                batch = None
                if batch_code:
                    batch, _ = Batch.objects.get_or_create(
                        institution=institution,
                        code=batch_code.upper(),
                        defaults={'name': f"Batch {batch_code.upper()}"}
                    )

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                )

                UserProfile.objects.create(
                    user=user,
                    institution=institution,
                    role='STUDENT',
                    phone=phone,
                    roll_number=roll_number or f"STU-{user.id:04d}",
                    batch=batch
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Row {row_idx}: Error creating student - {str(e)}")

    return {'created_count': created_count, 'errors': errors}
