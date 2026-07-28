import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import UserProfile, Freelancer, Recruiter, PastWork, Job, Message
from django.db.models import Q

# Helper: Normalize wage basis to hourly rate in USD
def get_hourly_equivalent(amount, basis):
    if basis == 'Per Day':
        return amount / 8.0
    elif basis == 'Weekly':
        return amount / 40.0
    elif basis == 'Monthly':
        return amount / 160.0
    elif basis == 'Yearly':
        return amount / 2000.0
    return amount  # Hourly

# Helper: Calculate Match Score
def calculate_match_score(freelancer, job):
    required_skills = []
    freelancer_skills = []

    try:
        required_skills = json.loads(job.required_skills or '[]')
    except Exception:
        required_skills = []

    try:
        freelancer_skills = json.loads(freelancer.skills or '[]')
    except Exception:
        freelancer_skills = []

    # 1. Skill Match Score (50%)
    skill_match_score = 100
    matching_skills = []
    missing_skills = []

    if required_skills:
        free_skills_lower = [s.lower() for s in freelancer_skills]
        for req_skill in required_skills:
            if req_skill.lower() in free_skills_lower:
                matching_skills.append(req_skill)
            else:
                missing_skills.append(req_skill)
        skill_match_score = (len(matching_skills) / len(required_skills)) * 100

    # 2. Rate Fit Score (30%) - Convert freelancer rate to hourly USD equivalent
    rate_fit_score = 100
    freelancer_hourly = get_hourly_equivalent(freelancer.wage_amount, freelancer.wage_basis)
    if freelancer_hourly > job.budget:
        diff = freelancer_hourly - job.budget
        penalty_pct = (diff / job.budget) * 100
        rate_fit_score = max(0, 100 - penalty_pct * 2)

    # 3. Experience Match Score (20%)
    exp_score = min((freelancer.experience_years / 10.0) * 100, 100)

    total_score = round(
        (skill_match_score * 0.5) +
        (rate_fit_score * 0.3) +
        (exp_score * 0.2)
    )

    return {
        'score': total_score,
        'skillMatchScore': skill_match_score,
        'rateFitScore': rate_fit_score,
        'experienceScore': exp_score,
        'matchingSkills': matching_skills,
        'missingSkills': missing_skills
    }

# ==========================================
# 1. AUTHENTICATION ENDPOINTS
# ==========================================

@csrf_exempt
@require_http_methods(["POST"])
def api_login(req):
    try:
        data = json.loads(req.body)
        username = data.get('username')
        password = data.get('password')
        
        user = UserProfile.objects.filter(username=username, password=password).first()
        if not user:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)

        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'profile_id': user.profile_id
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def api_register(req):
    try:
        data = json.loads(req.body)
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')
        name = data.get('name')
        title = data.get('title')
        company = data.get('company')

        if not username or not password or not role or not name:
            return JsonResponse({'error': 'Username, password, role, and name are required'}, status=400)

        if UserProfile.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username is already taken'}, status=400)

        profile_id = 0

        if role == 'freelancer':
            freelancer = Freelancer.objects.create(
                name=name,
                title=title or 'Freelancer',
                bio='New SkillConnect freelancer profile.',
                skills='[]',
                wage_amount=45.0,
                wage_basis='Hourly',
                experience_years=1,
                availability='Immediate',
                rating=5.0,
                efficiency_rating=90.0,
                portfolio_url=''
            )
            profile_id = freelancer.id
        else:
            recruiter = Recruiter.objects.create(
                name=name,
                company=company or 'Independent',
                industry='General',
                bio='Technical recruiter on SkillConnect.'
            )
            profile_id = recruiter.id

        user = UserProfile.objects.create(
            username=username,
            password=password,
            role=role,
            profile_id=profile_id
        )

        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'profile_id': user.profile_id
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# ==========================================
# 2. FREELANCER ENDPOINTS
# ==========================================

@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_freelancers(req):
    if req.method == "GET":
        try:
            skills = req.GET.get('skills')
            min_exp = req.GET.get('minExp')
            availability = req.GET.get('availability')
            currency = req.GET.get('currency', 'USD')
            wage_basis = req.GET.get('wageBasis', 'Hourly')
            min_wage = req.GET.get('minWage')
            max_wage = req.GET.get('maxWage')
            min_projects = req.GET.get('minProjects')

            qs = Freelancer.objects.all()

            if min_exp and min_exp.strip():
                try:
                    qs = qs.filter(experience_years__gte=int(min_exp))
                except ValueError:
                    pass
            if availability and availability != 'All':
                qs = qs.filter(availability=availability)

            freelancers_list = []
            for f in qs:
                completed_projects = f.past_work.count()
                
                # Check min projects filter
                if min_projects and min_projects.strip():
                    try:
                        if completed_projects < int(min_projects):
                            continue
                    except ValueError:
                        pass

                # Currency/wage conversion filter
                has_min = min_wage is not None and min_wage.strip() != ""
                has_max = max_wage is not None and max_wage.strip() != ""
                if has_min or has_max:
                    hourly_usd = get_hourly_equivalent(f.wage_amount, f.wage_basis)
                    usd_in_selected_basis = hourly_usd
                    if wage_basis == 'Per Day':
                        usd_in_selected_basis = hourly_usd * 8.0
                    elif wage_basis == 'Weekly':
                        usd_in_selected_basis = hourly_usd * 40.0
                    elif wage_basis == 'Monthly':
                        usd_in_selected_basis = hourly_usd * 160.0
                    elif wage_basis == 'Yearly':
                        usd_in_selected_basis = hourly_usd * 2000.0

                    rate_conv = 1.0
                    if currency == 'EUR':
                        rate_conv = 0.92
                    elif currency == 'INR':
                        rate_conv = 85.0

                    converted_wage = usd_in_selected_basis * rate_conv

                    try:
                        if has_min and converted_wage < float(min_wage):
                            continue
                        if has_max and converted_wage > float(max_wage):
                            continue
                    except ValueError:
                        pass

                # Filter by skills
                if skills:
                    search_skills = [s.strip().lower() for s in skills.split(',')]
                    try:
                        f_skills = [s.lower() for s in json.loads(f.skills or '[]')]
                    except Exception:
                        f_skills = []
                    
                    if not all(req_skill in f_skills for req_skill in search_skills):
                        continue

                freelancers_list.append({
                    'id': f.id,
                    'name': f.name,
                    'title': f.title,
                    'bio': f.bio,
                    'skills': f.skills,
                    'wage_amount': f.wage_amount,
                    'wage_basis': f.wage_basis,
                    'experience_years': f.experience_years,
                    'availability': f.availability,
                    'rating': f.rating,
                    'efficiency_rating': f.efficiency_rating,
                    'portfolio_url': f.portfolio_url,
                    'completed_projects': completed_projects
                })

            return JsonResponse(freelancers_list, safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    elif req.method == "POST":
        try:
            data = json.loads(req.body)
            fid = data.get('id')
            f = Freelancer.objects.get(id=fid)
            
            f.name = data.get('name', f.name)
            f.title = data.get('title', f.title)
            f.bio = data.get('bio', f.bio)
            
            skills_payload = data.get('skills', '[]')
            if isinstance(skills_payload, list):
                f.skills = json.dumps(skills_payload)
            else:
                f.skills = skills_payload
                
            f.wage_amount = float(data.get('wage_amount', f.wage_amount))
            f.wage_basis = data.get('wage_basis', f.wage_basis)
            f.experience_years = int(data.get('experience_years', f.experience_years))
            f.availability = data.get('availability', f.availability)
            f.portfolio_url = data.get('portfolio_url', f.portfolio_url)
            f.efficiency_rating = float(data.get('efficiency_rating', f.efficiency_rating))
            f.save()

            return JsonResponse({'success': True, 'message': 'Profile updated successfully', 'id': f.id})
        except Freelancer.DoesNotExist:
            return JsonResponse({'error': 'Freelancer profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def api_freelancer_detail(req, fid):
    try:
        f = Freelancer.objects.get(id=fid)
        return JsonResponse({
            'id': f.id,
            'name': f.name,
            'title': f.title,
            'bio': f.bio,
            'skills': f.skills,
            'wage_amount': f.wage_amount,
            'wage_basis': f.wage_basis,
            'experience_years': f.experience_years,
            'availability': f.availability,
            'rating': f.rating,
            'efficiency_rating': f.efficiency_rating,
            'portfolio_url': f.portfolio_url,
            'completed_projects': f.past_work.count()
        })
    except Freelancer.DoesNotExist:
        return JsonResponse({'error': 'Freelancer profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# ==========================================
# 3. PAST WORK HISTORY ENDPOINTS
# ==========================================

@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_past_work(req, fid):
    try:
        f = Freelancer.objects.get(id=fid)
    except Freelancer.DoesNotExist:
        return JsonResponse({'error': 'Freelancer profile not found'}, status=404)

    if req.method == "GET":
        try:
            works = f.past_work.all().order_by('-id')
            return JsonResponse([{
                'id': w.id,
                'freelancer_id': w.freelancer.id,
                'project_name': w.project_name,
                'client_company': w.client_company,
                'duration': w.duration,
                'description': w.description,
                'project_efficiency': w.project_efficiency
            } for w in works], safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    elif req.method == "POST":
        try:
            data = json.loads(req.body)
            w = PastWork.objects.create(
                freelancer=f,
                project_name=data.get('project_name'),
                client_company=data.get('client_company'),
                duration=data.get('duration'),
                description=data.get('description'),
                project_efficiency=int(data.get('project_efficiency', 95))
            )

            # Re-average overall efficiency rating
            all_works = f.past_work.all()
            if all_works.exists():
                avg_efficiency = sum(pw.project_efficiency for pw in all_works) / all_works.count()
                f.efficiency_rating = round(avg_efficiency, 1)
                f.save()

            return JsonResponse({
                'success': True,
                'id': w.id,
                'new_efficiency_rating': f.efficiency_rating
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

# ==========================================
# 4. RECRUITER & JOBS ENDPOINTS
# ==========================================

@csrf_exempt
@require_http_methods(["GET"])
def api_recruiters(req):
    try:
        recruiters = Recruiter.objects.all()
        return JsonResponse([{
            'id': r.id,
            'name': r.name,
            'company': r.company,
            'industry': r.industry,
            'bio': r.bio
        } for r in recruiters], safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_jobs(req):
    if req.method == "GET":
        try:
            jobs = Job.objects.all().order_by('-id')
            return JsonResponse([{
                'id': j.id,
                'title': j.title,
                'description': j.description,
                'budget': j.budget,
                'required_skills': j.required_skills,
                'duration': j.duration,
                'recruiter_id': j.recruiter.id,
                'recruiter_name': j.recruiter.name,
                'recruiter_company': j.recruiter.company
            } for j in jobs], safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    elif req.method == "POST":
        try:
            data = json.loads(req.body)
            recruiter_id = data.get('recruiter_id')
            recruiter = Recruiter.objects.get(id=recruiter_id)

            skills_payload = data.get('required_skills', '[]')
            if isinstance(skills_payload, list):
                skills_str = json.dumps(skills_payload)
            else:
                skills_str = skills_payload

            j = Job.objects.create(
                title=data.get('title'),
                description=data.get('description'),
                budget=float(data.get('budget')),
                required_skills=skills_str,
                duration=data.get('duration'),
                recruiter=recruiter
            )

            return JsonResponse({
                'id': j.id,
                'title': j.title,
                'recruiter_id': j.recruiter.id,
                'success': True
            })
        except Recruiter.DoesNotExist:
            return JsonResponse({'error': 'Recruiter not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

# ==========================================
# 5. SMART MATCH ENDPOINTS
# ==========================================

@csrf_exempt
@require_http_methods(["GET"])
def match_jobs_for_freelancer(req, fid):
    try:
        freelancer = Freelancer.objects.get(id=fid)
        jobs = Job.objects.all()
        
        matched_jobs = []
        for job in jobs:
            match_details = calculate_match_score(freelancer, job)
            matched_jobs.append({
                'id': job.id,
                'title': job.title,
                'description': job.description,
                'budget': job.budget,
                'required_skills': job.required_skills,
                'duration': job.duration,
                'recruiter_id': job.recruiter.id,
                'recruiter_name': job.recruiter.name,
                'recruiter_company': job.recruiter.company,
                'matchDetails': match_details
            })

        matched_jobs.sort(key=lambda x: x['matchDetails']['score'], reverse=True)
        return JsonResponse(matched_jobs, safe=False)
    except Freelancer.DoesNotExist:
        return JsonResponse({'error': 'Freelancer not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def match_freelancers_for_job(req, jid):
    try:
        job = Job.objects.get(id=jid)
        freelancers = Freelancer.objects.all()
        
        matched_freelancers = []
        for f in freelancers:
            match_details = calculate_match_score(f, job)
            completed_projects = f.past_work.count()
            
            matched_freelancers.append({
                'id': f.id,
                'name': f.name,
                'title': f.title,
                'bio': f.bio,
                'skills': f.skills,
                'wage_amount': f.wage_amount,
                'wage_basis': f.wage_basis,
                'experience_years': f.experience_years,
                'availability': f.availability,
                'rating': f.rating,
                'efficiency_rating': f.efficiency_rating,
                'portfolio_url': f.portfolio_url,
                'completed_projects': completed_projects,
                'matchDetails': match_details
            })

        matched_freelancers.sort(key=lambda x: x['matchDetails']['score'], reverse=True)
        return JsonResponse(matched_freelancers, safe=False)
    except Job.DoesNotExist:
        return JsonResponse({'error': 'Job not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# ==========================================
# 6. MESSAGE ENDPOINTS (CHAT SYSTEM)
# ==========================================

@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_messages(req):
    if req.method == "GET":
        try:
            freelancer_id = req.GET.get('freelancer_id')
            recruiter_id = req.GET.get('recruiter_id')
            
            if not freelancer_id or not recruiter_id:
                return JsonResponse({'error': 'freelancer_id and recruiter_id are required'}, status=400)

            # Filter messages between freelancer and recruiter
            messages = Message.objects.filter(
                (Q(sender_id=freelancer_id) & Q(sender_role='freelancer') & Q(receiver_id=recruiter_id) & Q(receiver_role='recruiter')) |
                (Q(sender_id=recruiter_id) & Q(sender_role='recruiter') & Q(receiver_id=freelancer_id) & Q(receiver_role='freelancer'))
            ).order_by('timestamp')

            return JsonResponse([{
                'id': m.id,
                'sender_id': m.sender_id,
                'sender_role': m.sender_role,
                'receiver_id': m.receiver_id,
                'receiver_role': m.receiver_role,
                'content': m.content,
                'timestamp': m.timestamp.isoformat()
            } for m in messages], safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    elif req.method == "POST":
        try:
            data = json.loads(req.body)
            sender_id = data.get('sender_id')
            sender_role = data.get('sender_role')
            receiver_id = data.get('receiver_id')
            receiver_role = data.get('receiver_role')
            content = data.get('content')

            if not sender_id or not sender_role or not receiver_id or not receiver_role or not content:
                return JsonResponse({'error': 'All fields are required'}, status=400)

            m = Message.objects.create(
                sender_id=int(sender_id),
                sender_role=sender_role,
                receiver_id=int(receiver_id),
                receiver_role=receiver_role,
                content=content
            )

            return JsonResponse({
                'id': m.id,
                'sender_id': m.sender_id,
                'sender_role': m.sender_role,
                'receiver_id': m.receiver_id,
                'receiver_role': m.receiver_role,
                'content': m.content,
                'timestamp': m.timestamp.isoformat(),
                'success': True
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def api_message_partners(req):
    try:
        user_id = req.GET.get('id')
        role = req.GET.get('role')

        if not user_id or not role:
            return JsonResponse({'error': 'id and role are required'}, status=400)

        user_id = int(user_id)

        # Get all messages where user is sender or receiver
        messages = Message.objects.filter(
            (Q(sender_id=user_id) & Q(sender_role=role)) |
            (Q(receiver_id=user_id) & Q(receiver_role=role))
        ).order_by('-timestamp')

        partners_dict = {}
        for m in messages:
            # Determine partner details
            is_sender = (m.sender_id == user_id and m.sender_role == role)
            partner_id = m.receiver_id if is_sender else m.sender_id
            partner_role = m.receiver_role if is_sender else m.sender_role

            key = (partner_id, partner_role)
            if key not in partners_dict:
                partners_dict[key] = {
                    'last_message': m.content,
                    'timestamp': m.timestamp.isoformat()
                }

        partners_list = []
        for (pid, prole), pdata in partners_dict.items():
            name = ''
            company = ''
            
            # Fetch partner's profile details
            if prole == 'freelancer':
                f = Freelancer.objects.filter(id=pid).first()
                if f:
                    name = f.name
            else:
                r = Recruiter.objects.filter(id=pid).first()
                if r:
                    name = r.name
                    company = r.company

            partners_list.append({
                'id': pid,
                'role': prole,
                'name': name,
                'company': company,
                'lastMessage': pdata['last_message'],
                'timestamp': pdata['timestamp']
            })

        return JsonResponse(partners_list, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
