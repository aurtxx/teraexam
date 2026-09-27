from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from exams.models import (
    Institution, Batch, UserProfile, Subject, Topic, Question,
    Exam, ExamSection, ExamQuestion, ExamAttempt, StudentAnswer, Announcement
)
from exams.services import calculate_ranks_and_percentiles


class Command(BaseCommand):
    help = "Seeds initial Indian coaching institute exam data, questions, batches, and student attempts"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding examination SaaS platform data...")

        # 1. Platform Admin user
        admin_user = User.objects.filter(username='admin').first()
        if not admin_user:
            admin_user = User.objects.create_superuser('admin', 'admin@teraexam.com', 'AdminPass123!')
        
        admin_profile, _ = UserProfile.objects.get_or_create(
            user=admin_user,
            defaults={'role': 'PLATFORM_ADMIN'}
        )
        admin_profile.role = 'PLATFORM_ADMIN'
        admin_profile.save()

        # 2. Institution 1: Apex IIT-JEE & NEET Academy
        apex, _ = Institution.objects.get_or_create(
            code="APEX-KOTA",
            defaults={
                'name': "Apex IIT-JEE & NEET Academy",
                'slug': "apex-academy",
                'tagline': "Kota's Premier Test Preparation & Assessment Hub",
                'logo_url': "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80",
                'primary_color': "#4f46e5",
                'contact_email': "director@apexacademy.in",
                'contact_phone': "+91 98290 12345",
                'address': "Plot 14, Vigyan Nagar Institutional Area, Kota, Rajasthan 324005",
                'subscription_tier': "INSTITUTE_PLUS",
                'max_students': 1000,
                'is_active': True,
            }
        )

        # 3. Institution 2: Pratibha Competitive Classes (For multi-tenant isolation testing)
        pratibha, _ = Institution.objects.get_or_create(
            code="PRATIBHA-DELHI",
            defaults={
                'name': "Pratibha Competitive Classes",
                'slug': "pratibha-delhi",
                'tagline': "Quality Coaching for SSC, Banking and State PCS",
                'primary_color': "#0891b2",
                'contact_email': "info@pratibhaclasses.com",
                'contact_phone': "+91 98110 54321",
                'address': "Mukherjee Nagar Commercial Complex, New Delhi 110009",
                'subscription_tier': "PRO_EDUCATOR",
                'max_students': 300,
                'is_active': True,
            }
        )

        # 4. Batches in Apex Academy
        batch_jee, _ = Batch.objects.get_or_create(
            institution=apex,
            code="JEE-ALPHA-26",
            defaults={
                'name': "Class 12 - Target JEE Advanced 2026 (Alpha Super 30)",
                'description': "Advanced problem solving and All India test series batch",
                'academic_year': "2025-2026"
            }
        )

        batch_neet, _ = Batch.objects.get_or_create(
            institution=apex,
            code="NEET-STAR-26",
            defaults={
                'name': "Target NEET 2026 - Star Repeaters Batch",
                'description': "NCERT line-by-line revision and speed testing batch",
                'academic_year': "2025-2026"
            }
        )

        # 5. Educator Admin & Teachers
        educator_user, created = User.objects.get_or_create(
            username='educator_apex',
            defaults={
                'email': 'director@apexacademy.in',
                'first_name': 'Dr. Rajesh',
                'last_name': 'Sharma',
                'is_staff': True,
            }
        )
        if created:
            educator_user.set_password('ApexPass123!')
            educator_user.save()
        UserProfile.objects.update_or_create(
            user=educator_user,
            defaults={'institution': apex, 'role': 'INSTITUTE_ADMIN', 'phone': '+91 98290 12345'}
        )

        teacher_user, created = User.objects.get_or_create(
            username='teacher_verma',
            defaults={
                'email': 'verma.physics@apexacademy.in',
                'first_name': 'H. C.',
                'last_name': 'Verma',
                'is_staff': True,
            }
        )
        if created:
            teacher_user.set_password('TeacherPass123!')
            teacher_user.save()
        UserProfile.objects.update_or_create(
            user=teacher_user,
            defaults={'institution': apex, 'role': 'TEACHER', 'phone': '+91 98290 55555'}
        )

        # 6. Students
        students_info = [
            ('student_arjun', 'arjun.mehta@example.com', 'Arjun', 'Mehta', 'APEX-2026-001', batch_jee),
            ('student_ananya', 'ananya.iyer@example.com', 'Ananya', 'Iyer', 'APEX-2026-002', batch_jee),
            ('student_rohit', 'rohit.gupta@example.com', 'Rohit', 'Gupta', 'APEX-2026-003', batch_jee),
            ('student_sneha', 'sneha.patel@example.com', 'Sneha', 'Patel', 'APEX-2026-004', batch_neet),
        ]

        student_objs = []
        for uname, email, fname, lname, roll, b in students_info:
            stu, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    'email': email,
                    'first_name': fname,
                    'last_name': lname,
                }
            )
            if created:
                stu.set_password('StudentPass123!')
                stu.save()
            prof, _ = UserProfile.objects.update_or_create(
                user=stu,
                defaults={
                    'institution': apex,
                    'role': 'STUDENT',
                    'roll_number': roll,
                    'batch': b,
                    'phone': '+91 98765 00000'
                }
            )
            student_objs.append((stu, prof))

        # 7. Subjects & Topics in Apex
        sub_phy, _ = Subject.objects.get_or_create(
            institution=apex, code="PHY",
            defaults={'name': "Physics", 'description': "Mechanics, Electrodynamics, Modern Physics"}
        )
        sub_chem, _ = Subject.objects.get_or_create(
            institution=apex, code="CHEM",
            defaults={'name': "Chemistry", 'description': "Physical, Organic, and Inorganic Chemistry"}
        )
        sub_math, _ = Subject.objects.get_or_create(
            institution=apex, code="MATH",
            defaults={'name': "Mathematics", 'description': "Calculus, Algebra, Coordinate Geometry"}
        )

        topic_rot, _ = Topic.objects.get_or_create(subject=sub_phy, name="Rotational Mechanics")
        topic_thermo, _ = Topic.objects.get_or_create(subject=sub_chem, name="Chemical Thermodynamics")
        topic_calc, _ = Topic.objects.get_or_create(subject=sub_math, name="Definite Integrals")

        # 8. Questions in Question Bank
        q1, _ = Question.objects.get_or_create(
            institution=apex,
            subject=sub_phy,
            topic=topic_rot,
            question_text="A solid cylinder of mass M and radius R rolls without slipping down an inclined plane of inclination θ. What is the acceleration of the cylinder down the incline?",
            defaults={
                'question_type': 'MCQ_SINGLE',
                'difficulty': 'MEDIUM',
                'options': [
                    {'id': 'A', 'text': 'g sin θ'},
                    {'id': 'B', 'text': '(2/3) g sin θ'},
                    {'id': 'C', 'text': '(1/2) g sin θ'},
                    {'id': 'D', 'text': '(3/4) g sin θ'}
                ],
                'correct_answers': ['B'],
                'explanation': 'For a rolling solid cylinder, I = (1/2)MR^2. The acceleration a = (g sin θ)/(1 + I/MR^2) = (g sin θ)/(1 + 0.5) = (2/3) g sin θ.',
                'tags': ['JEE-Main', 'Mechanics', 'Rolling'],
                'default_marks': Decimal('4.00'),
                'default_negative_marks': Decimal('1.00'),
                'created_by': teacher_user
            }
        )

        q2, _ = Question.objects.get_or_create(
            institution=apex,
            subject=sub_phy,
            topic=topic_rot,
            question_text="A flywheel rotates with an initial angular velocity of 20 rad/s. A constant opposing torque brings it to rest in 10 seconds. Calculate the total number of revolutions turned by the flywheel before coming to rest.",
            defaults={
                'question_type': 'NUMERICAL',
                'difficulty': 'EASY',
                'options': [],
                'correct_answers': {'value': 15.91, 'tolerance': 0.5},
                'explanation': 'Angular deceleration α = (0 - 20)/10 = -2 rad/s^2. Angular displacement θ = ω0*t + 0.5*α*t^2 = 20(10) - 0.5(2)(100) = 200 - 100 = 100 rad. Revolutions = 100 / (2π) ≈ 15.91 revolutions.',
                'tags': ['Rotational-Kinematics', 'Numerical'],
                'default_marks': Decimal('4.00'),
                'default_negative_marks': Decimal('0.00'),
                'created_by': teacher_user
            }
        )

        q3, _ = Question.objects.get_or_create(
            institution=apex,
            subject=sub_chem,
            topic=topic_thermo,
            question_text="Which of the following thermodynamic state functions have a value of zero for an ideal gas undergoing a reversible isothermal expansion?",
            defaults={
                'question_type': 'MCQ_MULTI',
                'difficulty': 'MEDIUM',
                'options': [
                    {'id': 'A', 'text': 'Change in internal energy (ΔU)'},
                    {'id': 'B', 'text': 'Change in enthalpy (ΔH)'},
                    {'id': 'C', 'text': 'Work done (W)'},
                    {'id': 'D', 'text': 'Change in entropy (ΔS)'}
                ],
                'correct_answers': ['A', 'B'],
                'explanation': 'For an ideal gas, internal energy and enthalpy depend solely on temperature. In an isothermal process, ΔT = 0, therefore ΔU = 0 and ΔH = 0. Work done W = -nRT ln(V2/V1) ≠ 0 and ΔS = nR ln(V2/V1) ≠ 0.',
                'tags': ['Thermodynamics', 'JEE-Advanced', 'MSQ'],
                'default_marks': Decimal('4.00'),
                'default_negative_marks': Decimal('1.00'),
                'created_by': teacher_user
            }
        )

        q4, _ = Question.objects.get_or_create(
            institution=apex,
            subject=sub_math,
            topic=topic_calc,
            question_text="Evaluate the definite integral: ∫ from 0 to π/2 of (sin^3(x) / (sin^3(x) + cos^3(x))) dx.",
            defaults={
                'question_type': 'MCQ_SINGLE',
                'difficulty': 'EASY',
                'options': [
                    {'id': 'A', 'text': 'π / 2'},
                    {'id': 'B', 'text': 'π / 4'},
                    {'id': 'C', 'text': 'π / 8'},
                    {'id': 'D', 'text': '1'}
                ],
                'correct_answers': ['B'],
                'explanation': 'Using King\'s property of definite integrals: ∫[a, b] f(x)dx = ∫[a, b] f(a+b-x)dx. 2I = ∫[0, π/2] 1 dx = π/2 => I = π/4.',
                'tags': ['Calculus', 'Definite-Integrals', 'Standard-Trick'],
                'default_marks': Decimal('4.00'),
                'default_negative_marks': Decimal('1.00'),
                'created_by': teacher_user
            }
        )

        q5, _ = Question.objects.get_or_create(
            institution=apex,
            subject=sub_math,
            topic=topic_calc,
            question_text="A function f(x) is continuous and differentiable on [0, 2]. If f(0) = 1 and f(2) = 5, then there exists at least one c in (0, 2) such that f'(c) = 2. State whether this statement is True or False.",
            defaults={
                'question_type': 'TRUE_FALSE',
                'difficulty': 'EASY',
                'options': [
                    {'id': 'TRUE', 'text': 'True'},
                    {'id': 'FALSE', 'text': 'False'}
                ],
                'correct_answers': ['TRUE'],
                'explanation': 'By Lagrange\'s Mean Value Theorem, there exists c in (0, 2) such that f\'(c) = (f(2) - f(0)) / (2 - 0) = (5 - 1)/2 = 4/2 = 2.',
                'tags': ['LMVT', 'Calculus'],
                'default_marks': Decimal('2.00'),
                'default_negative_marks': Decimal('0.50'),
                'created_by': teacher_user
            }
        )

        # 9. Scheduled Mock Exam: JEE Main Simulation Test
        now = timezone.now()
        exam_jee, _ = Exam.objects.get_or_create(
            institution=apex,
            code="JEE-MAIN-MOCK-01",
            defaults={
                'title': "All India JEE Main Mock Assessment #01",
                'description': "Comprehensive CBT mock test covering Physics, Chemistry, and Mathematics according to latest NTA JEE pattern.",
                'exam_mode': 'FLEXIBLE',
                'start_time': now - timedelta(hours=2),
                'end_time': now + timedelta(days=7),
                'duration_minutes': 180,
                'total_marks': Decimal('18.00'),
                'passing_percentage': Decimal('35.00'),
                'enable_negative_marking': True,
                'shuffle_questions': True,
                'status': 'LIVE',
                'results_published': True,
                'show_leaderboard': True,
                'created_by': educator_user
            }
        )
        exam_jee.batches.add(batch_jee)

        # Add questions to Exam
        for idx, q in enumerate([q1, q2, q3, q4, q5], start=1):
            ExamQuestion.objects.get_or_create(
                exam=exam_jee,
                question=q,
                defaults={
                    'order': idx,
                    'marks': q.default_marks,
                    'negative_marks': q.default_negative_marks
                }
            )
        exam_jee.recalculate_total_marks()

        # 10. Pre-generate student attempts for Arjun, Ananya, and Rohit
        # Attempt 1: Arjun Mehta (Top ranker)
        att_arjun, created = ExamAttempt.objects.get_or_create(
            exam=exam_jee,
            student=student_objs[0][0],
            attempt_number=1,
            defaults={
                'started_at': now - timedelta(hours=1, minutes=30),
                'expires_at': now + timedelta(hours=1, minutes=30),
                'submitted_at': now - timedelta(minutes=15),
                'time_spent_seconds': 4500,
                'status': 'SUBMITTED',
                'questions_order': [q1.id, q2.id, q3.id, q4.id, q5.id]
            }
        )
        if created:
            # Q1 correct (B)
            StudentAnswer.objects.create(attempt=att_arjun, question=q1, selected_options=['B'], status='ANSWERED')
            # Q2 correct (15.9)
            StudentAnswer.objects.create(attempt=att_arjun, question=q2, numerical_value='15.91', status='ANSWERED')
            # Q3 correct (A, B)
            StudentAnswer.objects.create(attempt=att_arjun, question=q3, selected_options=['A', 'B'], status='ANSWERED_AND_MARKED_FOR_REVIEW')
            # Q4 correct (B)
            StudentAnswer.objects.create(attempt=att_arjun, question=q4, selected_options=['B'], status='ANSWERED')
            # Q5 correct (TRUE)
            StudentAnswer.objects.create(attempt=att_arjun, question=q5, selected_options=['TRUE'], status='ANSWERED')
            att_arjun.evaluate_and_grade()

        # Attempt 2: Ananya Iyer (Second ranker)
        att_ananya, created = ExamAttempt.objects.get_or_create(
            exam=exam_jee,
            student=student_objs[1][0],
            attempt_number=1,
            defaults={
                'started_at': now - timedelta(hours=1, minutes=20),
                'expires_at': now + timedelta(hours=1, minutes=40),
                'submitted_at': now - timedelta(minutes=10),
                'time_spent_seconds': 4200,
                'status': 'SUBMITTED',
                'questions_order': [q1.id, q2.id, q3.id, q4.id, q5.id]
            }
        )
        if created:
            # Q1 correct (B)
            StudentAnswer.objects.create(attempt=att_ananya, question=q1, selected_options=['B'], status='ANSWERED')
            # Q2 incorrect
            StudentAnswer.objects.create(attempt=att_ananya, question=q2, numerical_value='25.0', status='ANSWERED')
            # Q3 correct (A, B)
            StudentAnswer.objects.create(attempt=att_ananya, question=q3, selected_options=['A', 'B'], status='ANSWERED')
            # Q4 correct (B)
            StudentAnswer.objects.create(attempt=att_ananya, question=q4, selected_options=['B'], status='ANSWERED')
            # Q5 correct (TRUE)
            StudentAnswer.objects.create(attempt=att_ananya, question=q5, selected_options=['TRUE'], status='ANSWERED')
            att_ananya.evaluate_and_grade()

        # Calculate ranks and percentiles
        calculate_ranks_and_percentiles(exam_jee)

        # 11. Announcements
        Announcement.objects.get_or_create(
            institution=apex,
            title="Important: JEE Main Mock Assessment #01 is Now LIVE",
            defaults={
                'content': "Dear Students, Mock Assessment #01 is now open on your portal. Ensure you take the test in a quiet environment on Chrome/Firefox. Results and rank list are published immediately after submission.",
                'priority': 'HIGH',
                'is_published': True,
                'created_by': educator_user
            }
        )

        Announcement.objects.get_or_create(
            institution=apex,
            title="Special Doubt Clearing Session on Rotational Dynamics",
            defaults={
                'content': "Prof. H. C. Verma will conduct a live question review session this Saturday at 4:00 PM in Lecture Hall A.",
                'priority': 'NORMAL',
                'is_published': True,
                'created_by': teacher_user
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded comprehensive examination SaaS data!"))
