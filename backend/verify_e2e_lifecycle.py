#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1:8000"

def get_session():
    s = requests.Session()
    # Fetch CSRF cookie
    r = s.get(f"{BASE_URL}/api/auth/csrf/")
    r.raise_for_status()
    csrf_token = r.json().get('csrfToken')
    s.headers.update({
        'X-CSRFToken': csrf_token,
        'Referer': f"{BASE_URL}/"
    })
    return s

def login(session, username, password):
    r = session.post(f"{BASE_URL}/api/auth/login/", json={
        'username': username,
        'password': password
    })
    if r.status_code != 200:
        raise Exception(f"Login failed for {username}: {r.status_code} - {r.text}")
    data = r.json()
    # update csrfToken if returned
    if 'csrfToken' in data:
        session.headers['X-CSRFToken'] = data['csrfToken']
    return data['user']

def run_e2e_verification():
    print("=================================================================")
    print("STEP 1: Educator Login & Setup")
    print("=================================================================")
    educator_session = get_session()
    educator_user = login(educator_session, "educator_apex", "ApexPass123!")
    print(f"✓ Educator logged in: {educator_user['full_name']} ({educator_user['role']}) - Institute: {educator_user['institution']['name']}")

    # Check questions available
    q_resp = educator_session.get(f"{BASE_URL}/api/questions/")
    q_resp.raise_for_status()
    questions = q_resp.json()
    if 'results' in questions:
        questions = questions['results']
    print(f"✓ Available Question Bank size: {len(questions)} questions")
    if not questions:
        raise Exception("No questions found in institute question bank!")

    q_ids = [q['id'] for q in questions[:3]]
    print(f"Selected question IDs for new exam: {q_ids}")

    # Check batches
    b_resp = educator_session.get(f"{BASE_URL}/api/batches/")
    b_resp.raise_for_status()
    batches = b_resp.json()
    if 'results' in batches:
        batches = batches['results']
    batch_ids = [b['id'] for b in batches]
    print(f"✓ Available Batches: {[b['name'] for b in batches]}")

    # Create new exam with end_time
    now = datetime.now(timezone.utc)
    start_time = now.isoformat()
    end_time = (now + timedelta(days=7)).isoformat()
    exam_payload = {
        "title": "E2E Automated Certification Exam",
        "description": "Full lifecycle verification exam testing proctoring, NTA evaluation, rank calculation, and scorecards.",
        "duration_minutes": 45,
        "start_time": start_time,
        "end_time": end_time,
        "enable_negative_marking": True,
        "shuffle_questions": False,
        "allow_multiple_attempts": False,
        "max_attempts": 1,
        "passing_percentage": "40.00",
        "status": "PUBLISHED",
        "results_published": True,
        "batches": batch_ids
    }
    
    exam_resp = educator_session.post(f"{BASE_URL}/api/exams/", json=exam_payload)
    if exam_resp.status_code not in [200, 201]:
        raise Exception(f"Exam creation failed: {exam_resp.status_code} - {exam_resp.text}")
    exam = exam_resp.json()
    exam_id = exam['id']
    print(f"✓ Exam created: ID {exam_id} | Code: {exam['code']} | Title: {exam['title']}")

    # Assign questions
    add_q_resp = educator_session.post(f"{BASE_URL}/api/exams/{exam_id}/add_questions/", json={
        "question_ids": q_ids,
        "marks": "4.00",
        "negative_marks": "1.00"
    })
    add_q_resp.raise_for_status()
    print(f"✓ Assigned {len(q_ids)} questions to exam: {add_q_resp.json()}")

    print("\n=================================================================")
    print("STEP 2: Student Login & Exam Portal Discovery")
    print("=================================================================")
    student_session = get_session()
    student_user = login(student_session, "student_arjun", "StudentPass123!")
    print(f"✓ Student logged in: {student_user['full_name']} | Roll: {student_user['roll_number']} | Batch: {student_user['batch_name']}")

    # Fetch available exams
    avail_resp = student_session.get(f"{BASE_URL}/api/student-portal/available_exams/")
    avail_resp.raise_for_status()
    avail_exams = avail_resp.json()
    target_exam = next((e for e in avail_exams if e['id'] == exam_id), None)
    if not target_exam:
        raise Exception(f"Exam {exam_id} not visible in student available_exams! Available: {[e['id'] for e in avail_exams]}")
    print(f"✓ Target exam visible to student: Status = {target_exam['status']} | Duration = {target_exam['duration_minutes']}m")

    print("\n=================================================================")
    print("STEP 3: Start Live CBT Attempt & Proctor Telemetry")
    print("=================================================================")
    start_resp = student_session.post(f"{BASE_URL}/api/student-portal/{exam_id}/start_attempt/")
    if start_resp.status_code != 200:
        raise Exception(f"Failed to start attempt: {start_resp.status_code} - {start_resp.text}")
    attempt_data = start_resp.json()
    attempt_id = attempt_data['attempt_id']
    print(f"✓ Started CBT attempt: Attempt ID {attempt_id} | Seconds remaining: {attempt_data['seconds_remaining']}")
    print(f"✓ Exam questions loaded: {len(attempt_data['questions'])}")

    # Send proctoring telemetry
    telemetry_payload = {
        "attempt_id": attempt_id,
        "event_type": "TAB_SWITCH",
        "severity": "WARNING",
        "details": "User switched browser tab away from CBT terminal (automated verification test)"
    }
    telem_resp = student_session.post(f"{BASE_URL}/api/student-portal/log_telemetry/", json=telemetry_payload)
    telem_resp.raise_for_status()
    print(f"✓ Telemetry recorded successfully: TAB_SWITCH warning logged.")

    # Second telemetry: fullscreen exit
    telem_resp2 = student_session.post(f"{BASE_URL}/api/student-portal/log_telemetry/", json={
        "attempt_id": attempt_id,
        "event_type": "FULLSCREEN_EXIT",
        "severity": "WARNING",
        "details": "Student exited fullscreen examination canvas."
    })
    telem_resp2.raise_for_status()
    print(f"✓ Telemetry recorded: FULLSCREEN_EXIT logged.")

    print("\n=================================================================")
    print("STEP 4: Answering Questions & Real-Time State Persistence")
    print("=================================================================")
    first_q = attempt_data['questions'][0]
    first_opt = first_q['options'][0]['id'] if first_q['options'] else 'A'
    save_resp = student_session.post(f"{BASE_URL}/api/student-portal/save_answer/", json={
        "attempt_id": attempt_id,
        "question_id": first_q['question_id'],
        "selected_options": [first_opt],
        "is_marked_for_review": False,
        "time_spent_delta": 30
    })
    save_resp.raise_for_status()
    print(f"✓ Question 1 response persisted: Status = {save_resp.json()['status']}")

    if len(attempt_data['questions']) > 1:
        second_q = attempt_data['questions'][1]
        second_opt = second_q['options'][0]['id'] if second_q['options'] else 'A'
        save_resp2 = student_session.post(f"{BASE_URL}/api/student-portal/save_answer/", json={
            "attempt_id": attempt_id,
            "question_id": second_q['question_id'],
            "selected_options": [second_opt],
            "is_marked_for_review": True,
            "time_spent_delta": 45
        })
        save_resp2.raise_for_status()
        print(f"✓ Question 2 response persisted (Marked for Review): Status = {save_resp2.json()['status']}")

    print("\n=================================================================")
    print("STEP 5: Submit Examination & Auto-Grading Engine")
    print("=================================================================")
    sub_resp = student_session.post(f"{BASE_URL}/api/student-portal/submit_attempt/", json={
        "attempt_id": attempt_id
    })
    if sub_resp.status_code != 200:
        raise Exception(f"Submit attempt failed: {sub_resp.status_code} - {sub_resp.text}")
    sub_data = sub_resp.json()
    print(f"✓ Exam submitted successfully! Total Score: {sub_data['total_score']} | Accuracy: {sub_data['accuracy_rate']}%")

    print("\n=================================================================")
    print("STEP 6: Scorecard & Standalone Official Print Verification")
    print("=================================================================")
    score_resp = student_session.get(f"{BASE_URL}/api/student-portal/scorecard/?attempt_id={attempt_id}")
    score_resp.raise_for_status()
    score_data = score_resp.json()
    print(f"✓ Scorecard retrieved: Score = {score_data['total_score']} / {score_data['max_possible_score']} | Rank = #{score_data['rank']} | Percentile = {score_data['percentile']}%")
    print(f"  Correct: {score_data['correct_count']} | Incorrect: {score_data['incorrect_count']} | Unattempted: {score_data['unattempted_count']}")

    # Test standalone printable scorecard HTML
    print_card_resp = student_session.get(f"{BASE_URL}/api/student-portal/printable_scorecard/?attempt_id={attempt_id}")
    print_card_resp.raise_for_status()
    assert "TeraExam Official Candidate Scorecard" in print_card_resp.text or "SCORECARD" in print_card_resp.text.upper()
    print(f"✓ Official Standalone Printable Scorecard HTML generated ({len(print_card_resp.text)} bytes)")

    print("\n=================================================================")
    print("STEP 7: Educator Analytics, Leaderboard & Proctoring Audit")
    print("=================================================================")
    analytics_resp = educator_session.get(f"{BASE_URL}/api/exams/{exam_id}/analytics/")
    analytics_resp.raise_for_status()
    analytics_data = analytics_resp.json()
    print(f"✓ Exam Analytics retrieved: Total Submissions = {analytics_data['total_attempts']} | Avg Score = {analytics_data['average_score']}")
    print(f"✓ Leaderboard count = {len(analytics_data['leaderboard'])}")
    leaderboard_entry = next((e for e in analytics_data['leaderboard'] if e['username'] == 'student_arjun'), None)
    if not leaderboard_entry:
        raise Exception("student_arjun not found on Educator's leaderboard!")
    print(f"  Leaderboard entry: Rank #{leaderboard_entry['rank']} | Score: {leaderboard_entry['score']} | Accuracy: {leaderboard_entry['accuracy']}%")

    # Proctoring Integrity Report
    proctor_resp = educator_session.get(f"{BASE_URL}/api/exams/{exam_id}/proctoring_report/")
    proctor_resp.raise_for_status()
    proctor_data = proctor_resp.json()
    total_warnings = proctor_data.get('total_warnings_issued', 0)
    print(f"✓ Proctoring Report retrieved: Flagged Candidates = {proctor_data.get('flagged_candidates_count', 0)} | Total Warnings = {total_warnings}")
    assert total_warnings >= 2, f"Expected at least 2 logged telemetry warnings, got {total_warnings}"

    # Printable Merit List
    merit_resp = educator_session.get(f"{BASE_URL}/api/exams/{exam_id}/printable_merit_list/")
    merit_resp.raise_for_status()
    assert "MASTER MERIT LIST" in merit_resp.text.upper() or "MERIT LIST" in merit_resp.text.upper()
    print(f"✓ Master Merit List Printable HTML generated ({len(merit_resp.text)} bytes)")

    print("\n=================================================================")
    print("STEP 8: Educator Reattempt Override (Candidate Retake Permission)")
    print("=================================================================")
    reattempt_resp = educator_session.post(f"{BASE_URL}/api/exams/{exam_id}/grant_reattempt/", json={
        "student_id": student_user['id'],
        "extra_attempts": 1,
        "reason": "Automated test re-attempt grant verified"
    })
    reattempt_resp.raise_for_status()
    reattempt_data = reattempt_resp.json()
    print(f"✓ Reattempt Override granted: {reattempt_data['message'] if 'message' in reattempt_data else reattempt_data['status']}")
    print(f"  Total Extra Attempts: {reattempt_data['total_extra_attempts']}")

    print("\n=================================================================")
    print("STEP 9: SaaS Usage & Audit Trail Verification")
    print("=================================================================")
    usage_resp = educator_session.get(f"{BASE_URL}/api/institutions/subscription_usage/")
    usage_resp.raise_for_status()
    usage_data = usage_resp.json()
    print(f"✓ Institution Usage: Plan: {usage_data['tier_name']} ({usage_data['subscription_tier']}) | Students: {usage_data['students']['current']}/{usage_data['students']['limit']} | Exams: {usage_data['monthly_exams']['current']}/{usage_data['monthly_exams']['limit']}")

    audit_resp = educator_session.get(f"{BASE_URL}/api/institutions/audit_logs/")
    audit_resp.raise_for_status()
    audit_data = audit_resp.json()
    print(f"✓ Security Audit Log entries: {len(audit_data)}")

    print("\n🎉 ALL 9 END-TO-END LIFECYCLE PHASES PASSED WITH 100% INTEGRITY! 🎉")
    return True

if __name__ == '__main__':
    try:
        run_e2e_verification()
    except Exception as e:
        print(f"\n❌ E2E VERIFICATION FAILED: {e}", file=sys.stderr)
        sys.exit(1)
