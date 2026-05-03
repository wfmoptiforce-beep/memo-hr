# 📧 Email Configuration Guide

## خيارات إرسال البريد

### ✅ الخيار 1: استخدام Resend (الموصى به)

**الخطوات:**

1. اذهب إلى https://resend.com وسجل حساب مجاني
2. احصل على `RESEND_API_KEY` من لوحة التحكم
3. في Supabase Dashboard:
   - اذهب إلى **Functions** → **Environment Variables**
   - أضف:
     ```
     RESEND_API_KEY = your_resend_api_key_here
     ```
4. Deploy الدالة:
   ```bash
   supabase functions deploy send-welcome-email --no-verify-jwt
   ```

### ✅ الخيار 2: استخدام Gmail SMTP

**الخطوات:**

1. قعّل 2FA في Gmail
2. اذهب إلى https://myaccount.google.com/apppasswords
3. احصل على App Password (16 حرف)
4. في Supabase:
   ```
   GMAIL_EMAIL = your-email@gmail.com
   GMAIL_PASSWORD = 16-character-app-password
   ```

### ✅ الخيار 3: استخدام Supabase Email المدمج

إذا كان لديك Supabase Pro:
- Email service مفعّل بالفعل
- الإيميلات تُرسل تلقائياً من Supabase

## 📝 التعديلات المطلوبة

قدّل البريد المُرسِل من في الدالة:
```typescript
from: "noreply@memo-pro.com", // غيّر هذا لبريدك الفعلي
```

## 🧪 الاختبار

```bash
# اختبر الدالة محلياً
supabase functions serve send-welcome-email

# أرسل طلب اختبار
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-welcome-email' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "loginUrl": "http://localhost:8000"
  }'
```

## 🔑 البيئات المتغيرة (Environment Variables)

في Supabase Console → Project Settings → Functions:

```
RESEND_API_KEY = sk_live_xxxxx (إذا استخدمت Resend)
GMAIL_EMAIL = your-email@gmail.com
GMAIL_PASSWORD = your-16-char-app-password
```

## ✨ النتيجة المتوقعة

عند إضافة موظف جديد:
1. ✅ ينشاء الحساب في Supabase Auth
2. ✅ تُحفظ البيانات في جدول profiles
3. 📧 **يُرسل ايميل ترحيب** تلقائياً يتضمن:
   - البريد الإلكتروني
   - كلمة السر
   - رابط الدخول
   - تعليمات الأمان

## ⚠️ استكشاف الأخطاء

إذا لم تُرسل الايميلات:

```bash
# شاهد سجلات الدالة
supabase functions logs send-welcome-email

# تحقق من API keys صحيحة
echo $RESEND_API_KEY

# اختبر الاتصال
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"recipient@example.com","subject":"Test","html":"<p>Test</p>"}'
```

## 📚 مراجع إضافية

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
