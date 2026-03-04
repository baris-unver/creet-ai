from fastapi import APIRouter, Depends

from app.config import Settings, get_settings

router = APIRouter()


@router.get("/policy-version")
async def get_policy_version(settings: Settings = Depends(get_settings)):
    return {"version": settings.POLICY_VERSION}


@router.get("/terms")
async def get_terms():
    return {
        "title": "Terms of Service",
        "version": "2026-03-04",
        "content": TERMS_CONTENT,
    }


@router.get("/privacy")
async def get_privacy():
    return {
        "title": "Privacy Policy",
        "version": "2026-03-04",
        "content": PRIVACY_CONTENT,
    }


@router.get("/cookies")
async def get_cookies():
    return {
        "title": "Cookie Policy",
        "version": "2026-03-04",
        "content": COOKIES_CONTENT,
    }


@router.get("/gdpr")
async def get_gdpr():
    return {
        "title": "GDPR & KVKK Compliance",
        "version": "2026-03-04",
        "content": GDPR_CONTENT,
    }


TERMS_CONTENT = """
# Terms of Service

Last updated: March 4, 2026

## 1. Acceptance of Terms
By accessing or using VideoCraft ("the Service"), you agree to be bound by these Terms of Service.

## 2. Description of Service
VideoCraft is an AI-powered video production platform that enables users to create videos from text briefs through an automated pipeline.

## 3. User Accounts
You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.

## 4. Acceptable Use
You agree not to use the Service to generate content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.

## 5. Intellectual Property
Content you create using the Service belongs to you, subject to the underlying AI providers' terms of service. You grant us a limited license to store and process your content as necessary to provide the Service.

## 6. Team Features
Team owners are responsible for managing team membership and ensuring all team members comply with these Terms.

## 7. API Keys
If you provide your own API keys for AI services, you are responsible for any charges incurred through those keys. We encrypt API keys at rest but cannot guarantee absolute security.

## 8. Limitation of Liability
The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages.

## 9. Changes to Terms
We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance.

## 10. Contact
For questions about these Terms, contact us at legal@creet.ai.
"""

PRIVACY_CONTENT = """
# Privacy Policy

Last updated: March 4, 2026

## 1. Information We Collect
- **Account Information**: Name, email address, and profile picture from Google OAuth.
- **Usage Data**: How you interact with the Service, including projects created and features used.
- **Generated Content**: Text, images, audio, and video you create using the Service.

## 2. How We Use Your Information
- To provide and maintain the Service
- To communicate with you about your account
- To improve the Service
- To comply with legal obligations

## 3. Data Storage
Your data is stored on servers located in the European Union. Generated content is stored in S3-compatible object storage.

## 4. Data Sharing
We do not sell your personal data. We share data with AI service providers (OpenAI, Anthropic, ElevenLabs, etc.) only as necessary to provide the Service.

## 5. Data Retention
We retain your data for as long as your account is active. You can request deletion at any time.

## 6. Your Rights
You have the right to access, correct, delete, and port your personal data. See our GDPR/KVKK section for details.

## 7. Cookies
We use essential cookies for authentication. See our Cookie Policy for details.

## 8. Contact
For privacy inquiries, contact us at privacy@creet.ai.
"""

COOKIES_CONTENT = """
# Cookie Policy

Last updated: March 4, 2026

## What Cookies We Use

### Essential Cookies
- **creet_token**: HttpOnly authentication cookie containing your session JWT. Required for the Service to function. Expires after 72 hours.

### No Tracking Cookies
We do not use any analytics, advertising, or tracking cookies.

## Managing Cookies
You can delete cookies through your browser settings. Note that deleting the authentication cookie will log you out.
"""

GDPR_CONTENT = """
# GDPR & KVKK Compliance

Last updated: March 4, 2026

## Your Rights Under GDPR and KVKK

### Right to Access (GDPR Art. 15 / KVKK Art. 11)
You can request a copy of all personal data we hold about you.

### Right to Rectification (GDPR Art. 16 / KVKK Art. 11)
You can request correction of inaccurate personal data.

### Right to Erasure (GDPR Art. 17 / KVKK Art. 7)
You can request deletion of your personal data. This will result in account termination.

### Right to Data Portability (GDPR Art. 20)
You can request your data in a machine-readable format.

### Right to Object (GDPR Art. 21 / KVKK Art. 11)
You can object to processing of your personal data.

## Data Processing Basis
We process your data based on:
- **Contract**: To provide the Service you've signed up for
- **Consent**: For optional features, which you can withdraw at any time

## Data Controller
CreetAI is the data controller. Contact: dpo@creet.ai

## Supervisory Authority
You have the right to lodge a complaint with your local data protection authority.

## KVKK Specific
For users in Turkey, our data processing complies with the Turkish Personal Data Protection Law (KVKK). You can exercise your rights by contacting kvkk@creet.ai.
"""
