from decimal import Decimal
from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from exams.models import (
    Institution, Batch, UserProfile, Subject, Topic, Question,
    Exam, ExamQuestion, ExamAttempt, StudentAnswer, Announcement
)
from exams.services import (
    calculate_ranks_and_percentiles, get_exam_analytics,
    get_student_scorecard, bulk_import_questions, bulk_import_students
)


class ExamPlatformTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create two distinct institutes for multi-tenancy verification
        self.inst_a = Institution.objects.create(
            name="Apex Academy", slug="apex-academy", code="APEX01"
        )
        self.inst_b = Institution.objects.create(
            name="Horizon Classes", slug="horizon-classes", code="HORIZON01"
        )

        # Batch in Institute A
        self.batch_a = Batch.objects.create(
            institution=self.inst_a, name="Batch 2026", code="B26"
        )

        # Educator in Institute A
        self.educator_a = User.objects.create_user(
            username='educator_a', password='Password123!', is_staff=True
        )
        UserProfile.objects.create(
            user=self.educator_a, institution=self.inst_a, role='INSTITUTE_ADMIN'
        )

        # Educator in Institute B
        self.educator_b = User.objects.create_user(
            username='educator_b', password='Password123!', is_staff=True
        )
        UserProfile.objects.create(
            user=self.educator_b, institution=self.inst_b, role='INSTITUTE_ADMIN'
        )

        # Students in Institute A
        self.student_1 = User.objects.create_user(
            username='student_1', password='Password123!'
        )
        UserProfile.objects.create(
            user=self.student_1, institution=self.inst_a, role='STUDENT',
            roll_number="STU-001", batch=self.batch_a
        )

        self.student_2 = User.objects.create_user(
            username='student_2', password='Password123!'
        )
        UserProfile.objects.create(
            user=self.student_2, institution=self.inst_a, role='STUDENT',
            roll_number="STU-002", batch=self.batch_a
        )

        # Subjects
        self.sub_phy = Subject.objects.create(institution=self.inst_a, name="Physics", code="PHY")
        self.sub_math = Subject.objects.create(institution=self.inst_a, name="Maths", code="MTH")

        # Questions
        self.q_mcq = Question.objects.create(
            institution=self.inst_a,
            subject=self.sub_phy,
            question_text="What is the unit of force?",
            question_type="MCQ_SINGLE",
            options=[{'id': 'A', 'text': 'Newton'}, {'id': 'B', 'text': 'Joule'}],
            correct_answers=['A'],
            default_marks=Decimal('4.00'),
            default_negative_marks=Decimal('1.00')
        )

        self.q_num = Question.objects.create(
            institution=self.inst_a,
            subject=self.sub_math,
            question_text="Value of 5 squared?",
            question_type="NUMERICAL",
            correct_answers={'value': 25.0, 'tolerance': 0.1},
            default_marks=Decimal('4.00'),
            default_negative_marks=Decimal('0.00')
        )

        # Exam in Institute A
        now = timezone.now()
        self.exam = Exam.objects.create(
            institution=self.inst_a,
            title="Physics & Maths Test",
            code="PM-01",
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(days=2),
            duration_minutes=60,
            enable_negative_marking=True,
            status="LIVE",
            results_published=True
        )
        self.exam.batches.add(self.batch_a)

        ExamQuestion.objects.create(exam=self.exam, question=self.q_mcq, order=1, marks=Decimal('4.00'), negative_marks=Decimal('1.00'))
        ExamQuestion.objects.create(exam=self.exam, question=self.q_num, order=2, marks=Decimal('4.00'), negative_marks=Decimal('0.00'))
        self.exam.recalculate_total_marks()

    def test_multi_tenant_isolation(self):
        """Educator B cannot view questions or exams belonging to Institute A."""
        self.client.force_authenticate(user=self.educator_b)
        response = self.client.get('/api/questions/')
        self.assertEqual(response.status_code, 200)
        # Should be empty for Institute B
        self.assertEqual(len(response.data['results'] if 'results' in response.data else response.data), 0)

        exam_response = self.client.get('/api/exams/')
        self.assertEqual(exam_response.status_code, 200)
        self.assertEqual(len(exam_response.data['results'] if 'results' in exam_response.data else exam_response.data), 0)

    def test_student_live_exam_flow(self):
        """Student can view available exams, start attempt, save answers, and submit."""
        self.client.force_authenticate(user=self.student_1)
        
        # 1. Available exams
        res = self.client.get('/api/student-portal/available_exams/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['code'], 'PM-01')

        # 2. Start attempt
        start_res = self.client.post(f'/api/student-portal/{self.exam.id}/start_attempt/')
        self.assertEqual(start_res.status_code, 200)
        attempt_id = start_res.data['attempt_id']
        self.assertIn('questions', start_res.data)
        self.assertNotIn('correct_answers', start_res.data['questions'][0])  # Security check: No answer keys exposed!

        # 3. Save answers
        # Q1: Correct ('A')
        save_1 = self.client.post('/api/student-portal/save_answer/', {
            'attempt_id': attempt_id,
            'question_id': self.q_mcq.id,
            'selected_options': ['A'],
            'is_marked_for_review': False
        }, format='json')
        self.assertEqual(save_1.status_code, 200)
        self.assertEqual(save_1.data['status'], 'ANSWERED')

        # Q2: Correct (25.0)
        save_2 = self.client.post('/api/student-portal/save_answer/', {
            'attempt_id': attempt_id,
            'question_id': self.q_num.id,
            'numerical_value': '25.0',
            'is_marked_for_review': True
        }, format='json')
        self.assertEqual(save_2.status_code, 200)
        self.assertEqual(save_2.data['status'], 'ANSWERED_AND_MARKED_FOR_REVIEW')

        # 4. Submit attempt
        submit_res = self.client.post('/api/student-portal/submit_attempt/', {
            'attempt_id': attempt_id
        }, format='json')
        self.assertEqual(submit_res.status_code, 200)
        self.assertEqual(submit_res.data['total_score'], 8.0)
        self.assertEqual(submit_res.data['accuracy_rate'], 100.0)

        # 5. Scorecard
        scorecard_res = self.client.get(f'/api/student-portal/scorecard/?attempt_id={attempt_id}')
        self.assertEqual(scorecard_res.status_code, 200)
        self.assertEqual(scorecard_res.data['total_score'], 8.0)
        self.assertEqual(scorecard_res.data['correct_count'], 2)
        self.assertEqual(scorecard_res.data['incorrect_count'], 0)

    def test_negative_marking_calculation(self):
        """Incorrect answer deducts negative marks properly."""
        self.client.force_authenticate(user=self.student_2)
        start_res = self.client.post(f'/api/student-portal/{self.exam.id}/start_attempt/')
        attempt_id = start_res.data['attempt_id']

        # Q1: Incorrect ('B' instead of 'A') -> -1.00 mark
        self.client.post('/api/student-portal/save_answer/', {
            'attempt_id': attempt_id,
            'question_id': self.q_mcq.id,
            'selected_options': ['B'],
        }, format='json')

        # Q2: Correct ('25.0') -> +4.00 marks
        self.client.post('/api/student-portal/save_answer/', {
            'attempt_id': attempt_id,
            'question_id': self.q_num.id,
            'numerical_value': '25.0',
        }, format='json')

        # Submit
        submit_res = self.client.post('/api/student-portal/submit_attempt/', {
            'attempt_id': attempt_id
        }, format='json')
        self.assertEqual(submit_res.status_code, 200)
        # Total score should be 4.0 - 1.0 = 3.0
        self.assertEqual(submit_res.data['total_score'], 3.0)

    def test_ranking_and_percentiles(self):
        """Student with higher score gets Rank 1 and 100% percentile."""
        # Create attempts directly
        now = timezone.now()
        att1 = ExamAttempt.objects.create(
            exam=self.exam, student=self.student_1, attempt_number=1,
            started_at=now, expires_at=now + timedelta(hours=1),
            submitted_at=now + timedelta(minutes=30), time_spent_seconds=1800,
            status='SUBMITTED'
        )
        StudentAnswer.objects.create(attempt=att1, question=self.q_mcq, selected_options=['A'])
        StudentAnswer.objects.create(attempt=att1, question=self.q_num, numerical_value='25.0')
        att1.evaluate_and_grade()

        att2 = ExamAttempt.objects.create(
            exam=self.exam, student=self.student_2, attempt_number=1,
            started_at=now, expires_at=now + timedelta(hours=1),
            submitted_at=now + timedelta(minutes=40), time_spent_seconds=2400,
            status='SUBMITTED'
        )
        StudentAnswer.objects.create(attempt=att2, question=self.q_mcq, selected_options=['B'])
        att2.evaluate_and_grade()

        calculate_ranks_and_percentiles(self.exam)

        att1.refresh_from_db()
        att2.refresh_from_db()

        self.assertEqual(att1.rank, 1)
        self.assertEqual(att1.percentile, Decimal('100.00'))
        self.assertEqual(att2.rank, 2)
        self.assertEqual(att2.percentile, Decimal('50.00'))

    def test_bulk_import_questions_csv(self):
        """Educator can import questions via CSV."""
        csv_data = (
            "subject_code,question_text,question_type,difficulty,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation\n"
            "PHY,What is acceleration due to gravity?,MCQ_SINGLE,EASY,9.8 m/s^2,10 m/s^2,8.9 m/s^2,12 m/s^2,A,4.00,1.00,Standard g value on Earth.\n"
        )
        res = bulk_import_questions(self.inst_a, self.educator_a, csv_data)
        self.assertEqual(res['created_count'], 1)
        self.assertEqual(len(res['errors']), 0)
        self.assertTrue(Question.objects.filter(institution=self.inst_a, question_text__icontains="acceleration due to gravity").exists())
