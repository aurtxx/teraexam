from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Institution, Batch, UserProfile, Subject, Topic, Question,
    Exam, ExamSection, ExamQuestion, ExamAttempt, StudentAnswer, Announcement,
    ProctoringEvent, ExamStudentOverride
)


class InstitutionSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    exam_count = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = [
            'id', 'name', 'slug', 'code', 'tagline', 'logo_url', 'primary_color',
            'contact_email', 'contact_phone', 'address', 'subscription_tier',
            'max_students', 'is_active', 'student_count', 'exam_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.members.filter(role='STUDENT').count()

    def get_exam_count(self, obj):
        return obj.exams.count()


class BatchSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'institution', 'name', 'code', 'description', 'academic_year', 'is_active', 'student_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'subject', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubjectSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'institution', 'name', 'code', 'description', 'topics', 'question_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_question_count(self, obj):
        return obj.questions.count()


class QuestionSerializer(serializers.ModelSerializer):
    """
    Teacher / Administrator serializer with full access to correct answers and explanations.
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'institution', 'subject', 'subject_name', 'subject_code',
            'topic', 'topic_name', 'question_text', 'question_type', 'difficulty',
            'options', 'correct_answers', 'explanation', 'tags',
            'default_marks', 'default_negative_marks', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'institution', 'created_at', 'updated_at', 'created_by']


class StudentLiveQuestionSerializer(serializers.ModelSerializer):
    """
    Sanitized question serializer for students during active CBT exam.
    NEVER exposes correct_answers or explanation!
    """
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)

    class Meta:
        model = Question
        fields = [
            'id', 'subject', 'subject_name', 'subject_code',
            'question_text', 'question_type', 'difficulty',
            'options', 'tags'
        ]


class ExamQuestionSerializer(serializers.ModelSerializer):
    question_details = QuestionSerializer(source='question', read_only=True)

    class Meta:
        model = ExamQuestion
        fields = ['id', 'exam', 'section', 'question', 'question_details', 'order', 'marks', 'negative_marks']
        read_only_fields = ['id']


class ExamSectionSerializer(serializers.ModelSerializer):
    questions = ExamQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = ExamSection
        fields = ['id', 'exam', 'name', 'order', 'instructions', 'questions']
        read_only_fields = ['id']


class ExamListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()
    batches_info = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'institution', 'title', 'code', 'description', 'exam_mode',
            'start_time', 'end_time', 'duration_minutes', 'total_marks', 'passing_percentage',
            'enable_negative_marking', 'negative_marking_type', 'shuffle_questions',
            'allow_multiple_attempts', 'max_attempts', 'status', 'results_published',
            'show_leaderboard', 'question_count', 'attempt_count', 'batches_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'institution', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.exam_questions.count()

    def get_attempt_count(self, obj):
        return obj.attempts.count()

    def get_batches_info(self, obj):
        return [{'id': b.id, 'name': b.name, 'code': b.code} for b in obj.batches.all()]


class ExamDetailSerializer(serializers.ModelSerializer):
    sections = ExamSectionSerializer(many=True, read_only=True)
    exam_questions = ExamQuestionSerializer(many=True, read_only=True)
    batches_info = serializers.SerializerMethodField()
    code = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.CharField(required=False, default="SCHEDULED")

    class Meta:
        model = Exam
        fields = [
            'id', 'institution', 'title', 'code', 'description', 'exam_mode',
            'start_time', 'end_time', 'duration_minutes', 'total_marks', 'passing_percentage',
            'enable_negative_marking', 'negative_marking_type', 'shuffle_questions', 'shuffle_options',
            'allow_multiple_attempts', 'max_attempts', 'batches', 'batches_info',
            'status', 'results_published', 'show_leaderboard', 'show_solutions_after_submit',
            'sections', 'exam_questions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'institution', 'created_at', 'updated_at']

    def validate(self, attrs):
        import uuid
        from django.utils import timezone
        code = attrs.get('code', '').strip()
        if not code:
            attrs['code'] = f"EXAM-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        else:
            attrs['code'] = code.upper()

        if attrs.get('status') == 'PUBLISHED':
            attrs['status'] = 'SCHEDULED'
        elif attrs.get('status') not in ['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED']:
            attrs['status'] = 'SCHEDULED'
            
        return attrs

    def get_batches_info(self, obj):
        return [{'id': b.id, 'name': b.name, 'code': b.code} for b in obj.batches.all()]


class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = [
            'id', 'attempt', 'question', 'selected_options', 'numerical_value',
            'text_value', 'is_marked_for_review', 'status', 'time_spent_seconds', 'saved_at'
        ]
        read_only_fields = ['id', 'saved_at']


class ExamAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    roll_number = serializers.SerializerMethodField()
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    duration_minutes = serializers.IntegerField(source='exam.duration_minutes', read_only=True)

    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_title', 'exam_code', 'duration_minutes',
            'student', 'student_name', 'student_username', 'roll_number',
            'attempt_number', 'started_at', 'submitted_at', 'expires_at',
            'status', 'time_spent_seconds', 'total_score', 'max_possible_score',
            'percentage', 'rank', 'percentile', 'accuracy_rate',
            'correct_count', 'incorrect_count', 'unattempted_count',
            'tab_switch_count', 'warning_count', 'fullscreen_exit_count',
            'copy_paste_count', 'proctoring_score', 'is_flagged_for_cheating',
            'flag_reason', 'created_at'
        ]
        read_only_fields = [
            'id', 'started_at', 'total_score', 'max_possible_score', 'percentage',
            'rank', 'percentile', 'accuracy_rate', 'correct_count', 'incorrect_count',
            'unattempted_count', 'created_at'
        ]

    def get_roll_number(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return profile.roll_number if profile else ''


class ProctoringEventSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='attempt.student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='attempt.student.username', read_only=True)
    exam_code = serializers.CharField(source='attempt.exam.code', read_only=True)

    class Meta:
        model = ProctoringEvent
        fields = [
            'id', 'attempt', 'student_name', 'student_username', 'exam_code',
            'event_type', 'severity', 'details', 'client_timestamp', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExamStudentOverrideSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    roll_number = serializers.SerializerMethodField()
    granted_by_name = serializers.CharField(source='granted_by.get_full_name', read_only=True)

    class Meta:
        model = ExamStudentOverride
        fields = [
            'id', 'exam', 'student', 'student_name', 'student_username',
            'roll_number', 'extra_attempts', 'reason', 'granted_by',
            'granted_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_roll_number(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return profile.roll_number if profile else ''


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    batch_names = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'institution', 'title', 'content', 'priority',
            'target_batches', 'batch_names', 'is_published',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_batch_names(self, obj):
        return [b.name for b in obj.target_batches.all()]


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    batch_name = serializers.CharField(source='batch.name', read_only=True, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user_id', 'username', 'email', 'first_name', 'last_name',
            'institution', 'institution_name', 'role', 'phone', 'roll_number',
            'batch', 'batch_name', 'avatar_url', 'created_at'
        ]
        read_only_fields = ['id', 'user_id', 'created_at']
