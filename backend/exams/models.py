import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Institution(models.Model):
    """
    Tenant entity representing an independent coaching institute, tutor, or school.
    All student, batch, question bank, and exam data are strictly isolated by institution.
    """
    TIER_CHOICES = [
        ('FREE_TRIAL', 'Free Trial'),
        ('PRO_EDUCATOR', 'Pro Educator'),
        ('INSTITUTE_PLUS', 'Institute Plus'),
        ('ENTERPRISE', 'Enterprise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text="e.g. Apex IIT-JEE Academy")
    slug = models.SlugField(max_length=220, unique=True)
    code = models.CharField(max_length=50, unique=True, help_text="Unique institution identifier")
    tagline = models.CharField(max_length=255, blank=True, default="")
    logo_url = models.CharField(max_length=500, blank=True, default="")
    primary_color = models.CharField(max_length=20, default="#4f46e5")
    contact_email = models.EmailField(blank=True, default="")
    contact_phone = models.CharField(max_length=30, blank=True, default="")
    address = models.TextField(blank=True, default="")
    subscription_tier = models.CharField(max_length=30, choices=TIER_CHOICES, default='PRO_EDUCATOR')
    max_students = models.PositiveIntegerField(default=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Batch(models.Model):
    """
    A class/cohort of students within an institution (e.g. 'Class 12 - Target JEE 2027').
    """
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, default="")
    academic_year = models.CharField(max_length=50, default="2026-2027")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('institution', 'code')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} [{self.institution.code}]"


class UserProfile(models.Model):
    """
    User extension specifying role, institutional membership, roll number, and batch.
    """
    ROLE_CHOICES = [
        ('PLATFORM_ADMIN', 'Platform Administrator'),
        ('INSTITUTE_ADMIN', 'Institute Administrator / Principal'),
        ('TEACHER', 'Teacher / Staff Faculty'),
        ('INVIGILATOR', 'Exam Invigilator / Proctor'),
        ('STUDENT', 'Student'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    institution = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='members',
        help_text="Null for global SaaS platform administrators"
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='STUDENT')
    phone = models.CharField(max_length=30, blank=True, default="")
    roll_number = models.CharField(max_length=50, blank=True, default="")
    batch = models.ForeignKey(
        Batch,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='students'
    )
    avatar_url = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['user__first_name', 'user__last_name', 'user__username']

    def __str__(self):
        inst_name = self.institution.name if self.institution else "Global"
        return f"{self.user.username} ({self.role}) - {inst_name}"


class Subject(models.Model):
    """
    Subject/Discipline (e.g. Physics, Chemistry, Mathematics, Biology, General Studies).
    """
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('institution', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.institution.code})"


class Topic(models.Model):
    """
    Sub-topic within a subject (e.g. 'Rotational Dynamics', 'Organic Chemistry').
    """
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('subject', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.subject.name} - {self.name}"


class Question(models.Model):
    """
    Central Question Bank item supporting multiple Indian competitive and board examination formats:
    - MCQ_SINGLE: Single correct choice
    - MCQ_MULTI: Multiple correct choices (MSQ)
    - NUMERICAL: Exact numerical or range with tolerance (JEE Advanced style)
    - TRUE_FALSE: True or False
    - SHORT_ANSWER: Short text match
    """
    TYPE_CHOICES = [
        ('MCQ_SINGLE', 'Single Choice (MCQ)'),
        ('MCQ_MULTI', 'Multiple Correct (MSQ)'),
        ('NUMERICAL', 'Numerical Value'),
        ('TRUE_FALSE', 'True / False'),
        ('SHORT_ANSWER', 'Short Answer'),
    ]
    DIFFICULTY_CHOICES = [
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard'),
    ]

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='questions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions')
    topic = models.ForeignKey(Topic, null=True, blank=True, on_delete=models.SET_NULL, related_name='questions')
    
    question_text = models.TextField(help_text="Formatted question text with LaTeX/Markdown support")
    question_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='MCQ_SINGLE')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    
    # Options stored as list of dicts: [{"id": "A", "text": "Option 1"}, {"id": "B", "text": "Option 2"}, ...]
    options = models.JSONField(default=list, blank=True)
    
    # Correct answer format:
    # - MCQ_SINGLE: ["A"]
    # - MCQ_MULTI: ["A", "C"]
    # - NUMERICAL: {"value": 15.5, "tolerance": 0.1}
    # - TRUE_FALSE: ["TRUE"]
    # - SHORT_ANSWER: ["mitochondria", "powerhouse"]
    correct_answers = models.JSONField(default=list)
    
    explanation = models.TextField(blank=True, default="", help_text="Step-by-step solution shown after exam results published")
    tags = models.JSONField(default=list, blank=True, help_text="e.g. ['JEE-Main', 'PYQ-2024']")
    
    default_marks = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('4.00'))
    default_negative_marks = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'))
    
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.subject.code}] {self.question_text[:60]}..."


class Exam(models.Model):
    """
    Scheduled or flexible online examination created by an educator.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SCHEDULED', 'Scheduled'),
        ('LIVE', 'Live'),
        ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    ]
    MODE_CHOICES = [
        ('STRICT_WINDOW', 'Strict Window (Fixed Start & End Time)'),
        ('FLEXIBLE', 'Flexible Window (Take Anytime Between Dates)'),
    ]

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='exams')
    title = models.CharField(max_length=250)
    code = models.CharField(max_length=60)
    description = models.TextField(blank=True, default="Instructions and syllabus details.")
    
    exam_mode = models.CharField(max_length=30, choices=MODE_CHOICES, default='FLEXIBLE')
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=180, help_text="Duration in minutes (e.g. 180 for 3 hours)")
    
    total_marks = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('300.00'))
    passing_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('35.00'))
    
    enable_negative_marking = models.BooleanField(default=True)
    negative_marking_type = models.CharField(max_length=20, default='FIXED', choices=[('FIXED', 'Fixed Deduction'), ('PERCENTAGE', 'Percentage of Question Marks')])
    
    shuffle_questions = models.BooleanField(default=True, help_text="Randomize question sequence for each student")
    shuffle_options = models.BooleanField(default=False, help_text="Randomize option order")
    
    allow_multiple_attempts = models.BooleanField(default=False)
    max_attempts = models.PositiveIntegerField(default=1)
    
    batches = models.ManyToManyField(Batch, blank=True, related_name='assigned_exams')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    results_published = models.BooleanField(default=False, help_text="Control when student scorecards and answers become visible")
    show_leaderboard = models.BooleanField(default=True)
    show_solutions_after_submit = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('institution', 'code')
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.title} ({self.code})"

    def recalculate_total_marks(self):
        total = self.exam_questions.aggregate(total=models.Sum('marks'))['total'] or Decimal('0.00')
        self.total_marks = total
        self.save(update_fields=['total_marks'])


class ExamSection(models.Model):
    """
    Sections within an exam (e.g. Physics, Chemistry, Mathematics; or Section A / Section B).
    """
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True, default="")

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.exam.title} - {self.name}"


class ExamQuestion(models.Model):
    """
    Association between an Exam, optional Section, and a Question from the Question Bank.
    Allows overriding marks/negative marks per exam instance.
    """
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='exam_questions')
    section = models.ForeignKey(ExamSection, null=True, blank=True, on_delete=models.CASCADE, related_name='questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='exam_instances')
    order = models.PositiveIntegerField(default=1)
    marks = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('4.00'))
    negative_marks = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.00'))

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('exam', 'question')

    def __str__(self):
        return f"{self.exam.code} Q#{self.order}: {self.question.id}"


class ExamAttempt(models.Model):
    """
    A student's live or completed examination attempt.
    Tracks precise timing, question sequence, proctoring metrics, and final calculated score/rank.
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted by Student'),
        ('TIMED_OUT', 'Auto-Submitted (Timer Expired)'),
        ('EVALUATED', 'Evaluated & Graded'),
        ('CANCELLED', 'Cancelled / Disqualified'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_attempts')
    attempt_number = models.PositiveIntegerField(default=1)
    
    started_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS')
    time_spent_seconds = models.PositiveIntegerField(default=0)
    
    total_score = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('0.00'))
    max_possible_score = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('0.00'))
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    rank = models.PositiveIntegerField(null=True, blank=True)
    percentile = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    accuracy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    correct_count = models.PositiveIntegerField(default=0)
    incorrect_count = models.PositiveIntegerField(default=0)
    unattempted_count = models.PositiveIntegerField(default=0)
    
    # Store deterministic list of question IDs for this attempt
    questions_order = models.JSONField(default=list, blank=True)
    
    # Proctoring telemetry
    ip_address = models.CharField(max_length=60, blank=True, default="")
    user_agent = models.CharField(max_length=255, blank=True, default="")
    tab_switch_count = models.PositiveIntegerField(default=0)
    warning_count = models.PositiveIntegerField(default=0)
    fullscreen_exit_count = models.PositiveIntegerField(default=0)
    copy_paste_count = models.PositiveIntegerField(default=0)
    proctoring_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.00'))
    is_flagged_for_cheating = models.BooleanField(default=False)
    flag_reason = models.CharField(max_length=255, blank=True, default="")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('exam', 'student', 'attempt_number')
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} - {self.exam.code} Attempt #{self.attempt_number} ({self.status})"

    def evaluate_and_grade(self):
        """
        Comprehensive automated evaluation engine supporting:
        - MCQ_SINGLE, MCQ_MULTI, NUMERICAL (with tolerance), TRUE_FALSE, SHORT_ANSWER.
        - Negative marks deduction.
        - Total score, accuracy percentage, and breakdown calculations.
        """
        exam_questions = {eq.question_id: eq for eq in self.exam.exam_questions.select_related('question')}
        answers = {ans.question_id: ans for ans in self.answers.select_related('question')}
        
        total_score = Decimal('0.00')
        max_possible = Decimal('0.00')
        correct = 0
        incorrect = 0
        unattempted = 0

        for qid, eq in exam_questions.items():
            max_possible += eq.marks
            ans = answers.get(qid)
            
            # Check if student answered
            has_response = False
            if ans:
                if eq.question.question_type in ['MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE'] and ans.selected_options:
                    has_response = True
                elif eq.question.question_type == 'NUMERICAL' and ans.numerical_value is not None and str(ans.numerical_value).strip() != "":
                    has_response = True
                elif eq.question.question_type == 'SHORT_ANSWER' and ans.text_value and ans.text_value.strip() != "":
                    has_response = True

            if not has_response:
                unattempted += 1
                if ans:
                    ans.is_correct = False
                    ans.marks_awarded = Decimal('0.00')
                    ans.save(update_fields=['is_correct', 'marks_awarded'])
                continue

            # Evaluate response
            is_correct = False
            q_type = eq.question.question_type
            correct_keys = eq.question.correct_answers

            if q_type == 'MCQ_SINGLE':
                # Exact single option match
                selected = set(ans.selected_options)
                expected = set(correct_keys if isinstance(correct_keys, list) else [correct_keys])
                is_correct = (selected == expected)

            elif q_type == 'MCQ_MULTI':
                # Multiple choice (MSQ) exact match
                selected = set(ans.selected_options)
                expected = set(correct_keys if isinstance(correct_keys, list) else [correct_keys])
                is_correct = (selected == expected)

            elif q_type == 'TRUE_FALSE':
                selected = str(ans.selected_options[0] if ans.selected_options else "").strip().upper()
                expected = str(correct_keys[0] if isinstance(correct_keys, list) else correct_keys).strip().upper()
                is_correct = (selected == expected)

            elif q_type == 'NUMERICAL':
                try:
                    val = float(ans.numerical_value)
                    if isinstance(correct_keys, dict):
                        target = float(correct_keys.get('value', 0))
                        tolerance = float(correct_keys.get('tolerance', 0.01))
                        is_correct = abs(val - target) <= tolerance
                    else:
                        target = float(correct_keys[0] if isinstance(correct_keys, list) else correct_keys)
                        is_correct = abs(val - target) <= 0.01
                except (ValueError, TypeError):
                    is_correct = False

            elif q_type == 'SHORT_ANSWER':
                ans_text = ans.text_value.strip().lower()
                expected_list = [str(x).strip().lower() for x in (correct_keys if isinstance(correct_keys, list) else [correct_keys])]
                is_correct = ans_text in expected_list

            # Award marks or apply negative marks
            if is_correct:
                correct += 1
                awarded = eq.marks
                total_score += awarded
            else:
                incorrect += 1
                if self.exam.enable_negative_marking:
                    awarded = -abs(eq.negative_marks)
                    total_score += awarded
                else:
                    awarded = Decimal('0.00')

            ans.is_correct = is_correct
            ans.marks_awarded = awarded
            ans.save(update_fields=['is_correct', 'marks_awarded'])

        attempted = correct + incorrect
        accuracy = (Decimal(correct) / Decimal(attempted) * Decimal('100.00')) if attempted > 0 else Decimal('0.00')
        percentage = (total_score / max_possible * Decimal('100.00')) if max_possible > Decimal('0.00') else Decimal('0.00')

        self.total_score = total_score
        self.max_possible_score = max_possible
        self.correct_count = correct
        self.incorrect_count = incorrect
        self.unattempted_count = unattempted
        self.accuracy_rate = round(accuracy, 2)
        self.percentage = round(percentage, 2)
        self.status = 'EVALUATED'
        self.save()


class StudentAnswer(models.Model):
    """
    Granular answer submitted by a student for a single question in an attempt.
    Includes the standard Indian CBT 5-state navigation palette indicators:
    - NOT_VISITED: Question not seen yet
    - VISITED_UNANSWERED: Seen but no answer picked
    - ANSWERED: Answer picked
    - MARKED_FOR_REVIEW: Marked for review without answer
    - ANSWERED_AND_MARKED_FOR_REVIEW: Answer picked and marked for review (evaluated in Indian exams)
    """
    STATUS_CHOICES = [
        ('NOT_VISITED', 'Not Visited'),
        ('VISITED_UNANSWERED', 'Not Answered'),
        ('ANSWERED', 'Answered'),
        ('MARKED_FOR_REVIEW', 'Marked for Review'),
        ('ANSWERED_AND_MARKED_FOR_REVIEW', 'Answered & Marked for Review'),
    ]

    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    
    selected_options = models.JSONField(default=list, blank=True)
    numerical_value = models.CharField(max_length=50, blank=True, null=True)
    text_value = models.TextField(blank=True, default="")
    
    is_marked_for_review = models.BooleanField(default=False)
    status = models.CharField(max_length=35, choices=STATUS_CHOICES, default='NOT_VISITED')
    
    is_correct = models.BooleanField(null=True, blank=True)
    marks_awarded = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    time_spent_seconds = models.PositiveIntegerField(default=0)
    saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('attempt', 'question')

    def __str__(self):
        return f"Attempt {self.attempt_id} - Q{self.question_id}: {self.status}"


class Announcement(models.Model):
    """
    Educator / Institute notice board to communicate exam schedules, results, or alerts.
    """
    PRIORITY_CHOICES = [
        ('NORMAL', 'Normal'),
        ('HIGH', 'Important'),
        ('URGENT', 'Urgent Alert'),
    ]

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    target_batches = models.ManyToManyField(Batch, blank=True, related_name='announcements')
    is_published = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.institution.code}] {self.title}"


class ProctoringEvent(models.Model):
    """
    Granular audit log of student browser and environmental anomalies during a live CBT exam attempt.
    Tracks tab switches, fullscreen escapes, copy-paste attempts, and devtools openings.
    """
    EVENT_CHOICES = [
        ('TAB_SWITCH', 'Tab Switch (Lost Focus)'),
        ('WINDOW_BLUR', 'Window Blur / Application Switch'),
        ('FULLSCREEN_EXIT', 'Fullscreen Mode Exited'),
        ('COPY_PASTE', 'Copy / Cut / Paste Intercepted'),
        ('DEVTOOLS_OPEN', 'Developer Tools Detected'),
        ('RIGHT_CLICK', 'Context Menu Intercepted'),
        ('HEARTBEAT', 'Periodic Live Heartbeat'),
        ('IP_CHANGE', 'IP Address Changed Mid-Exam'),
    ]
    SEVERITY_CHOICES = [
        ('INFO', 'Informational'),
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical Violation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='proctoring_events')
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='WARNING')
    details = models.JSONField(default=dict, blank=True)
    client_timestamp = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.attempt.student.username} - {self.event_type} ({self.severity}) at {self.created_at}"


class ExamStudentOverride(models.Model):
    """
    Grants an individual student exceptional re-attempt permissions or extra attempts
    on a specific exam without altering global exam rules for the whole batch.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='student_overrides')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_overrides')
    extra_attempts = models.PositiveIntegerField(default=1, help_text="Number of additional attempts granted")
    reason = models.CharField(max_length=255, blank=True, default="Technical glitch / Retake approved by educator")
    granted_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='granted_overrides')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('exam', 'student')
        ordering = ['-created_at']

    def __str__(self):
        return f"Override for {self.student.username} on {self.exam.code}: +{self.extra_attempts} attempts"

