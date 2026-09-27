from decimal import Decimal
from django.utils import timezone
from django.db import models


SUBSCRIPTION_TIERS = {
    'FREE_TRIAL': {
        'code': 'FREE_TRIAL',
        'name': 'Free Trial',
        'max_students': 25,
        'max_exams_per_month': 5,
        'max_questions': 100,
        'price_inr': 0,
        'features': [
            'Standard NTA/JEE CBT examination system',
            'Automatic grading & evaluation',
            'Scorecard & basic leaderboard',
            'CSV results export',
        ],
    },
    'PRO_EDUCATOR': {
        'code': 'PRO_EDUCATOR',
        'name': 'Pro Educator',
        'max_students': 250,
        'max_exams_per_month': 50,
        'max_questions': 2500,
        'price_inr': 1499,
        'features': [
            'All Free Trial features',
            'Anti-cheating proctoring telemetry & anomaly flags',
            'Institute custom color branding & logo',
            'JEE Main/Advanced & NEET negative marking rules',
            'Printable student scorecards (PDF ready)',
            'Batch-level performance insights',
        ],
    },
    'INSTITUTE_PLUS': {
        'code': 'INSTITUTE_PLUS',
        'name': 'Institute Plus',
        'max_students': 1000,
        'max_exams_per_month': 200,
        'max_questions': 10000,
        'price_inr': 3999,
        'features': [
            'All Pro features',
            'Official Institute Merit Lists & Rank Sheets',
            'Deep item discrimination & question accuracy analysis',
            'Student re-attempt and retake lifecycle manager',
            'Multiple faculty and teacher accounts',
            'Institutional audit logs',
        ],
    },
    'ENTERPRISE': {
        'code': 'ENTERPRISE',
        'name': 'Enterprise Coaching',
        'max_students': 10000,
        'max_exams_per_month': 1000,
        'max_questions': 50000,
        'price_inr': 9999,
        'features': [
            'All features unlocked',
            'Complete white-label institute portal',
            'Custom sub-domains & dedicated infrastructure',
            'Dedicated technical account manager & 99.9% SLA',
            'Bulk student & question concierge migration',
        ],
    },
}


def get_tier_config(tier_code):
    return SUBSCRIPTION_TIERS.get(tier_code, SUBSCRIPTION_TIERS['PRO_EDUCATOR'])


def get_institution_usage(institution):
    """
    Computes current resource usage against subscription quotas for an institution.
    """
    tier = get_tier_config(institution.subscription_tier)
    
    # 1. Student capacity
    student_count = institution.members.filter(role='STUDENT').count()
    max_students = institution.max_students or tier['max_students']
    student_pct = round((student_count / max_students * 100), 1) if max_students > 0 else 0.0
    
    # 2. Monthly exam creation
    now = timezone.now()
    exams_this_month = institution.exams.filter(
        created_at__year=now.year,
        created_at__month=now.month
    ).count()
    max_exams = tier['max_exams_per_month']
    exam_pct = round((exams_this_month / max_exams * 100), 1) if max_exams > 0 else 0.0

    # 3. Question bank capacity
    question_count = institution.questions.count()
    max_questions = tier['max_questions']
    question_pct = round((question_count / max_questions * 100), 1) if max_questions > 0 else 0.0

    needs_upgrade = (student_pct >= 90.0 or exam_pct >= 90.0 or question_pct >= 90.0)

    return {
        'institution_id': str(institution.id),
        'institution_name': institution.name,
        'subscription_tier': tier['code'],
        'tier_name': tier['name'],
        'price_inr': tier['price_inr'],
        'features': tier['features'],
        'students': {
            'current': student_count,
            'limit': max_students,
            'usage_percentage': min(100.0, student_pct),
            'is_exhausted': student_count >= max_students
        },
        'monthly_exams': {
            'current': exams_this_month,
            'limit': max_exams,
            'usage_percentage': min(100.0, exam_pct),
            'is_exhausted': exams_this_month >= max_exams
        },
        'question_bank': {
            'current': question_count,
            'limit': max_questions,
            'usage_percentage': min(100.0, question_pct),
            'is_exhausted': question_count >= max_questions
        },
        'needs_upgrade': needs_upgrade,
        'available_tiers': [
            {'code': k, 'name': v['name'], 'price_inr': v['price_inr'], 'max_students': v['max_students'], 'max_exams': v['max_exams_per_month']}
            for k, v in SUBSCRIPTION_TIERS.items()
        ]
    }


def check_student_quota(institution, count_to_add=1):
    """
    Validates if adding students exceeds the institution's quota.
    """
    tier = get_tier_config(institution.subscription_tier)
    max_students = institution.max_students or tier['max_students']
    current_count = institution.members.filter(role='STUDENT').count()
    if (current_count + count_to_add) > max_students:
        return False, f"Student limit reached ({current_count}/{max_students}) for plan '{tier['name']}'. Please upgrade your subscription to enroll more students."
    return True, None


def check_exam_quota(institution):
    """
    Validates if creating a new exam in the current month exceeds quota.
    """
    tier = get_tier_config(institution.subscription_tier)
    now = timezone.now()
    exams_this_month = institution.exams.filter(
        created_at__year=now.year,
        created_at__month=now.month
    ).count()
    max_exams = tier['max_exams_per_month']
    if exams_this_month >= max_exams:
        return False, f"Monthly exam quota reached ({exams_this_month}/{max_exams}) for plan '{tier['name']}'. Upgrade to schedule more exams this month."
    return True, None


def check_question_quota(institution, count_to_add=1):
    """
    Validates if adding questions exceeds the institution's question bank limit.
    """
    tier = get_tier_config(institution.subscription_tier)
    max_questions = tier['max_questions']
    current_count = institution.questions.count()
    if (current_count + count_to_add) > max_questions:
        return False, f"Question bank limit reached ({current_count}/{max_questions}) for plan '{tier['name']}'. Upgrade to add more questions."
    return True, None
