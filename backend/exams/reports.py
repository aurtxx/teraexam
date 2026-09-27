import html
from decimal import Decimal
from django.db import models
from django.utils import timezone


def generate_printable_scorecard_html(attempt):
    """
    Renders an official, print-ready, high-resolution HTML scorecard.
    Optimized for physical A4 printing (window.print()) and PDF generation.
    """
    exam = attempt.exam
    inst = exam.institution
    student = attempt.student
    profile = getattr(student, 'profile', None)
    
    roll_number = html.escape(profile.roll_number if profile and profile.roll_number else 'N/A')
    student_name = html.escape(student.get_full_name() or student.username)
    batch_name = html.escape(profile.batch.name if profile and profile.batch else 'General Batch')
    exam_title = html.escape(exam.title)
    exam_code = html.escape(exam.code)
    inst_name = html.escape(inst.name)
    inst_tagline = html.escape(inst.tagline or 'Center for Excellence in Competitive Examinations')
    primary_color = inst.primary_color or '#4f46e5'

    date_str = attempt.submitted_at.strftime("%d %B %Y, %I:%M %p") if attempt.submitted_at else attempt.started_at.strftime("%d %B %Y")
    
    # Calculate subject-wise metrics
    exam_questions = exam.exam_questions.select_related('question', 'question__subject').order_by('order')
    answers_map = {ans.question_id: ans for ans in attempt.answers.select_related('question')}

    subject_stats = {}
    question_rows = []

    for eq in exam_questions:
        q = eq.question
        sub = q.subject.name
        if sub not in subject_stats:
            subject_stats[sub] = {
                'total_q': 0, 'attempted': 0, 'correct': 0,
                'score': Decimal('0.00'), 'max_score': Decimal('0.00')
            }
        subject_stats[sub]['total_q'] += 1
        subject_stats[sub]['max_score'] += eq.marks

        ans = answers_map.get(q.id)
        ans_status = ans.status if ans else 'NOT_VISITED'
        marks = ans.marks_awarded if ans else Decimal('0.00')
        is_corr = ans.is_correct if ans else False

        if ans and ans_status in ['ANSWERED', 'ANSWERED_AND_MARKED_FOR_REVIEW']:
            subject_stats[sub]['attempted'] += 1
            if is_corr:
                subject_stats[sub]['correct'] += 1
            subject_stats[sub]['score'] += marks

        # Question row representation
        selected_display = "None"
        if ans:
            if ans.selected_options:
                selected_display = ", ".join(ans.selected_options)
            elif ans.numerical_value:
                selected_display = str(ans.numerical_value)
            elif ans.text_value:
                selected_display = ans.text_value[:20]

        correct_display = "Hidden"
        if exam.results_published:
            if isinstance(q.correct_answers, list):
                correct_display = ", ".join(str(x) for x in q.correct_answers)
            elif isinstance(q.correct_answers, dict):
                correct_display = str(q.correct_answers.get('value', ''))
            else:
                correct_display = str(q.correct_answers)

        status_badge_class = 'unattempted'
        if is_corr:
            status_badge_class = 'correct'
        elif ans and ans_status in ['ANSWERED', 'ANSWERED_AND_MARKED_FOR_REVIEW']:
            status_badge_class = 'incorrect'

        question_rows.append(f"""
        <tr>
            <td style="text-align: center; font-weight: 600;">{eq.order}</td>
            <td>{html.escape(sub)}</td>
            <td>{html.escape(q.question_type)}</td>
            <td style="text-align: center;">{float(eq.marks)}</td>
            <td style="text-align: center;">{selected_display}</td>
            <td style="text-align: center; font-weight: 600;">{correct_display}</td>
            <td style="text-align: center;">
                <span class="badge {status_badge_class}">
                    {'+' if marks > 0 else ''}{float(marks)}
                </span>
            </td>
        </tr>
        """)

    # Subject summary rows
    sub_summary_rows = []
    for sub, s in subject_stats.items():
        sub_pct = round((s['score'] / s['max_score'] * 100) if s['max_score'] > 0 else 0, 1)
        sub_summary_rows.append(f"""
        <tr>
            <td style="font-weight: 600;">{html.escape(sub)}</td>
            <td style="text-align: center;">{s['total_q']}</td>
            <td style="text-align: center;">{s['attempted']}</td>
            <td style="text-align: center; color: #16a34a; font-weight: 600;">{s['correct']}</td>
            <td style="text-align: center; font-weight: bold;">{float(s['score'])} / {float(s['max_score'])}</td>
            <td style="text-align: center; font-weight: 600;">{sub_pct}%</td>
        </tr>
        """)

    # Integrity block
    integrity_html = """
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
            <strong style="color: #166534; font-size: 13px;">✓ Exam Integrity Verified</strong>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #15803d;">CBT proctoring session recorded normal behavior. No critical violations detected.</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #166534;">
            Session Proctoring Score: <strong>100%</strong>
        </div>
    </div>
    """
    if attempt.is_flagged_for_cheating:
        integrity_html = f"""
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: #991b1b; font-size: 13px;">⚠ Proctoring Anomaly Flagged</strong>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #b91c1c;">Flag Reason: {html.escape(attempt.flag_reason or 'Multiple window switches')}</p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #991b1b;">
                Tab Switches: {attempt.tab_switch_count} | Warnings: {attempt.warning_count}
            </div>
        </div>
        """

    html_page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Scorecard - {roll_number} - {exam_code}</title>
    <style>
        * {{ box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
        body {{
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 20px;
        }}
        .scorecard-card {{
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid {primary_color};
            padding-bottom: 16px;
            margin-bottom: 20px;
        }}
        .institute-name {{
            font-size: 24px;
            font-weight: 800;
            color: {primary_color};
            letter-spacing: -0.5px;
            margin: 0;
        }}
        .institute-tagline {{
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }}
        .exam-badge {{
            text-align: right;
        }}
        .exam-title {{
            font-size: 16px;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
        }}
        .exam-meta {{
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }}
        .student-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 14px;
            margin-bottom: 20px;
        }}
        .grid-item label {{
            display: block;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-weight: 600;
        }}
        .grid-item span {{
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
        }}
        .stats-highlight {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }}
        .stat-box {{
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }}
        .stat-val {{
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
        }}
        .stat-label {{
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 4px;
        }}
        .percentile-box {{
            background: #eef2ff;
            border-color: #c7d2fe;
        }}
        .percentile-box .stat-val {{
            color: {primary_color};
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
        }}
        th {{
            background: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 8px 10px;
            border-bottom: 2px solid #e2e8f0;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
        }}
        td {{
            padding: 8px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }}
        .badge {{
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
        }}
        .badge.correct {{ background: #dcfce7; color: #15803d; }}
        .badge.incorrect {{ background: #fee2e2; color: #b91c1c; }}
        .badge.unattempted {{ background: #f1f5f9; color: #64748b; }}
        
        .footer-signatures {{
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11px;
            color: #64748b;
        }}
        .signature-block {{
            text-align: center;
            width: 180px;
        }}
        .signature-line {{
            height: 40px;
            border-bottom: 1px solid #94a3b8;
            margin-bottom: 6px;
        }}
        
        .print-btn {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: {primary_color};
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        @media print {{
            body {{ background: transparent; padding: 0; }}
            .scorecard-card {{ border: none; box-shadow: none; padding: 0; max-width: 100%; }}
            .print-btn {{ display: none; }}
            @page {{ size: A4; margin: 12mm; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨 Print Scorecard / Save PDF</button>

    <div class="scorecard-card">
        <div class="header">
            <div>
                <h1 class="institute-name">{inst_name}</h1>
                <div class="institute-tagline">{inst_tagline}</div>
            </div>
            <div class="exam-badge">
                <h2 class="exam-title">{exam_title}</h2>
                <div class="exam-meta">Code: <strong>{exam_code}</strong> | Date: {date_str}</div>
            </div>
        </div>

        <div class="student-grid">
            <div class="grid-item">
                <label>Roll Number</label>
                <span>{roll_number}</span>
            </div>
            <div class="grid-item">
                <label>Candidate Name</label>
                <span>{student_name}</span>
            </div>
            <div class="grid-item">
                <label>Batch / Group</label>
                <span>{batch_name}</span>
            </div>
            <div class="grid-item">
                <label>Attempt #</label>
                <span>#{attempt.attempt_number}</span>
            </div>
        </div>

        <div class="stats-highlight">
            <div class="stat-box">
                <div class="stat-val">{float(attempt.total_score)} <span style="font-size: 14px; color: #94a3b8;">/ {float(attempt.max_possible_score)}</span></div>
                <div class="stat-label">Total Score</div>
            </div>
            <div class="stat-box">
                <div class="stat-val">#{attempt.rank or '-'}</div>
                <div class="stat-label">Institute Rank</div>
            </div>
            <div class="stat-box percentile-box">
                <div class="stat-val">{float(attempt.percentile)}%</div>
                <div class="stat-label">NTA Percentile</div>
            </div>
            <div class="stat-box">
                <div class="stat-val">{float(attempt.accuracy_rate)}%</div>
                <div class="stat-label">Accuracy Rate</div>
            </div>
        </div>

        <h3 style="font-size: 13px; text-transform: uppercase; color: #475569; margin-bottom: 8px;">Subject-Wise Performance</h3>
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th style="text-align: center;">Total Questions</th>
                    <th style="text-align: center;">Attempted</th>
                    <th style="text-align: center;">Correct</th>
                    <th style="text-align: center;">Score</th>
                    <th style="text-align: center;">Percentage</th>
                </tr>
            </thead>
            <tbody>
                {''.join(sub_summary_rows)}
            </tbody>
        </table>

        {integrity_html}

        <h3 style="font-size: 13px; text-transform: uppercase; color: #475569; margin: 24px 0 8px 0;">Itemized Question Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th style="text-align: center; width: 40px;">Q#</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th style="text-align: center;">Marks</th>
                    <th style="text-align: center;">Your Choice</th>
                    <th style="text-align: center;">Key</th>
                    <th style="text-align: center;">Awarded</th>
                </tr>
            </thead>
            <tbody>
                {''.join(question_rows)}
            </tbody>
        </table>

        <div class="footer-signatures">
            <div class="signature-block">
                <div class="signature-line"></div>
                <div>Candidate Signature</div>
            </div>
            <div style="text-align: center; font-size: 10px; color: #94a3b8; align-self: flex-end;">
                Computer-generated scorecard • TeraExam SaaS Platform
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <div>Center Superintendent</div>
            </div>
        </div>
    </div>
</body>
</html>
"""
    return html_page


def generate_printable_merit_list_html(exam):
    """
    Renders an official, print-ready Institute Master Merit List / Rank Sheet for an Exam.
    """
    inst = exam.institution
    attempts = exam.attempts.filter(
        status__in=['EVALUATED', 'SUBMITTED', 'TIMED_OUT']
    ).select_related('student', 'student__profile', 'student__profile__batch').order_by('rank', '-total_score')

    total_candidates = attempts.count()
    highest_score = attempts.first().total_score if attempts.exists() else 0.0
    avg_score = round(float(attempts.aggregate(avg=models.Avg('total_score'))['avg'] or 0.0), 1) if attempts.exists() else 0.0

    inst_name = html.escape(inst.name)
    exam_title = html.escape(exam.title)
    exam_code = html.escape(exam.code)
    primary_color = inst.primary_color or '#4f46e5'

    date_str = exam.start_time.strftime("%d %B %Y")

    table_rows = []
    for att in attempts:
        prof = getattr(att.student, 'profile', None)
        roll = html.escape(prof.roll_number if prof and prof.roll_number else '-')
        name = html.escape(att.student.get_full_name() or att.student.username)
        batch = html.escape(prof.batch.name if prof and prof.batch else 'General')
        
        flag_status = '<span style="color: #16a34a; font-weight: 600;">Verified</span>'
        if att.is_flagged_for_cheating:
            flag_status = f'<span style="color: #dc2626; font-weight: 700;">⚠ Flagged ({att.tab_switch_count} switches)</span>'

        table_rows.append(f"""
        <tr>
            <td style="text-align: center; font-weight: 700; color: #1e293b;">#{att.rank or '-'}</td>
            <td style="font-weight: 600;">{roll}</td>
            <td style="font-weight: 600; color: #0f172a;">{name}</td>
            <td>{batch}</td>
            <td style="text-align: center; font-weight: 700; color: #0f172a;">{float(att.total_score)} <span style="font-size: 10px; color: #94a3b8;">/ {float(att.max_possible_score)}</span></td>
            <td style="text-align: center; font-weight: 700; color: {primary_color};">{float(att.percentile)}%</td>
            <td style="text-align: center;">{float(att.accuracy_rate)}%</td>
            <td style="text-align: center;">{att.correct_count} / {att.incorrect_count} / {att.unattempted_count}</td>
            <td style="text-align: center;">{flag_status}</td>
        </tr>
        """)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Merit List - {exam_code}</title>
    <style>
        * {{ box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
        body {{
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 24px;
        }}
        .merit-container {{
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }}
        .header {{
            border-bottom: 2px solid {primary_color};
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }}
        .inst-title {{
            font-size: 24px;
            font-weight: 800;
            color: {primary_color};
            margin: 0 0 4px 0;
        }}
        .exam-info {{
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin: 0;
        }}
        .summary-bar {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f1f5f9;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 24px;
        }}
        .bar-item {{
            text-align: center;
        }}
        .bar-label {{
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
            color: #64748b;
        }}
        .bar-val {{
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }}
        th {{
            background: #f8fafc;
            color: #475569;
            padding: 10px;
            border-bottom: 2px solid #cbd5e1;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
        }}
        td {{
            padding: 10px;
            border-bottom: 1px solid #f1f5f9;
        }}
        tr:nth-child(even) {{
            background: #fafafa;
        }}
        .print-btn {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: {primary_color};
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        @media print {{
            body {{ background: transparent; padding: 0; }}
            .merit-container {{ border: none; box-shadow: none; padding: 0; max-width: 100%; }}
            .print-btn {{ display: none; }}
            @page {{ size: A4 landscape; margin: 10mm; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨 Print Merit List / Save PDF</button>

    <div class="merit-container">
        <div class="header">
            <div>
                <h1 class="inst-title">{inst_name}</h1>
                <p class="exam-info">Official Merit List • {exam_title} ({exam_code})</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
                Date Conducted: <strong>{date_str}</strong>
            </div>
        </div>

        <div class="summary-bar">
            <div class="bar-item">
                <div class="bar-label">Total Candidates</div>
                <div class="bar-val">{total_candidates}</div>
            </div>
            <div class="bar-item">
                <div class="bar-label">Highest Score</div>
                <div class="bar-val">{float(highest_score)} <span style="font-size: 12px; color: #94a3b8;">/ {float(exam.total_marks)}</span></div>
            </div>
            <div class="bar-item">
                <div class="bar-label">Batch Average</div>
                <div class="bar-val">{avg_score}</div>
            </div>
            <div class="bar-item">
                <div class="bar-label">Passing % Cutoff</div>
                <div class="bar-val">{float(exam.passing_percentage)}%</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="text-align: center; width: 60px;">Rank</th>
                    <th>Roll No</th>
                    <th>Candidate Name</th>
                    <th>Batch</th>
                    <th style="text-align: center;">Score</th>
                    <th style="text-align: center;">Percentile</th>
                    <th style="text-align: center;">Accuracy</th>
                    <th style="text-align: center;">C / I / U</th>
                    <th style="text-align: center;">Integrity</th>
                </tr>
            </thead>
            <tbody>
                {''.join(table_rows)}
            </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
            End of Official Merit List • Authenticated by TeraExam Examination Engine
        </div>
    </div>
</body>
</html>
"""
    return html_content
