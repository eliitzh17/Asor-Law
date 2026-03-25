// Page load time for time-on-page tracking
const pageLoadTime = Date.now();

// Header scroll effect
const header = document.getElementById('header');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }

    // Active nav link
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-links a[href="#${id}"]`);

        if (link) {
            if (scrollPos >= top && scrollPos < top + height) {
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        }
    });
});

// Back to top
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
});

// Close mobile menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// Scroll animations (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Instant field validation
function validateField(field) {
    const val = field.value.trim();
    field.classList.remove('invalid', 'valid');

    // Skip validation on empty optional fields
    if (!field.required && val === '') return true;

    // Skip if never touched
    if (!field.dataset.touched) return true;

    if (field.checkValidity() && (val !== '' || !field.required)) {
        if (val !== '') field.classList.add('valid');
        return true;
    } else {
        field.classList.add('invalid');
        return false;
    }
}

// Attach instant validation: validate on blur, update on input
document.querySelectorAll('#contactForm input:not([type=hidden]), #contactForm textarea').forEach(f => {
    f.addEventListener('blur', () => {
        f.dataset.touched = 'true';
        validateField(f);
    });
    f.addEventListener('input', () => {
        if (f.dataset.touched) validateField(f);
    });
});

// Form submit handler
async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const fields = form.querySelectorAll('input:not([type=hidden]), textarea');
    let valid = true;

    fields.forEach(f => {
        f.dataset.touched = 'true';
        if (!validateField(f)) valid = false;
    });

    if (!valid) {
        form.querySelector('.invalid')?.focus();
        return;
    }

    const btn = form.querySelector('.form-submit');
    const originalText = btn.textContent;
    btn.textContent = btn.dataset.sending || 'שולח...';
    btn.disabled = true;

    try {
        const rtl = '\u200F';
        const now = new Date();
        const timestamp = now.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
        const device = /Mobi|Android/i.test(navigator.userAgent) ? 'נייד' : 'מחשב';
        const referrer = document.referrer || 'ישיר';
        const lang = navigator.language || navigator.userLanguage || 'לא ידוע';
        const params = new URLSearchParams(window.location.search);
        const utmSource = params.get('utm_source') || '';
        const utmMedium = params.get('utm_medium') || '';
        const utmCampaign = params.get('utm_campaign') || '';
        const utmStr = [utmSource, utmMedium, utmCampaign].filter(Boolean).join(' / ') || 'ללא';
        const seconds = Math.round((Date.now() - pageLoadTime) / 1000);
        const minutes = Math.floor(seconds / 60);
        const timeOnPage = minutes > 0 ? minutes + ' דקות ו-' + (seconds % 60) + ' שניות' : seconds + ' שניות';

        const browser = (function() {
            const ua = navigator.userAgent;
            if (ua.includes('Edg/')) return 'Edge';
            if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
            if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
            if (ua.includes('Firefox/')) return 'Firefox';
            if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
            return 'אחר';
        })();

        const pageLang = document.documentElement.lang || 'he';
        const langLabel = { he: 'עברית', en: 'English', ar: 'العربية' }[pageLang] || pageLang;

        const meta = [
            'נשלח בתאריך: ' + timestamp,
            'שפת העמוד: ' + langLabel,
            'סוג מכשיר: ' + device,
            'דפדפן: ' + browser,
            'שפת דפדפן: ' + lang,
            'רזולוציית מסך: ' + screen.width + 'x' + screen.height,
            'עמוד מקור: ' + window.location.href,
            'הגיע מ: ' + referrer,
            'קמפיין (UTM): ' + utmStr,
            'זמן שהייה בעמוד: ' + timeOnPage
        ].join('\n');

        const subjectSuffix = pageLang !== 'he' ? ' (' + langLabel + ')' : '';

        const payload = {
            access_key: '50c491ee-83db-4906-bb6f-3b3a287cbbab',
            subject: 'פנייה חדשה מהאתר - עשור ושות׳' + subjectSuffix,
            from_name: 'אתר עשור ושות׳',
            replyto: form.querySelector('#email').value || undefined,
            [rtl + 'שם מלא']: rtl + form.querySelector('#name').value,
            [rtl + 'טלפון']: rtl + form.querySelector('#phone').value,
            [rtl + 'דואל']: rtl + form.querySelector('#email').value,
            [rtl + 'הודעה']: rtl + form.querySelector('#message').value,
            [rtl + 'פרטים טכניים']: rtl + meta,
        };
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            btn.textContent = btn.dataset.success || 'הפנייה נשלחה בהצלחה!';
            btn.style.background = '#27ae60';
            form.reset();
            fields.forEach(f => {
                f.classList.remove('invalid', 'valid');
                delete f.dataset.touched;
            });
        } else {
            btn.textContent = btn.dataset.error || 'שגיאה בשליחה, נסו שוב';
            btn.style.background = '#e74c3c';
        }
    } catch {
        btn.textContent = btn.dataset.error || 'שגיאה בשליחה, נסו שוב';
        btn.style.background = '#e74c3c';
    }

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
    }, 3000);
}

// Counter animation for hero stats
function animateCounters() {
    const counters = document.querySelectorAll('.hero-stat-number');
    counters.forEach(counter => {
        const text = counter.textContent;
        const hasPlus = text.includes('+');
        const hasTilde = text.includes('~');
        const hasComma = text.includes(',');
        const num = parseInt(text.replace(/[^0-9]/g, ''));

        if (isNaN(num)) return;

        let current = 0;
        const step = Math.ceil(num / 60);
        const timer = setInterval(() => {
            current += step;
            if (current >= num) {
                current = num;
                clearInterval(timer);
            }
            let display = hasComma
                ? current.toLocaleString()
                : current.toString();
            if (hasTilde) display = '~' + display;
            if (hasPlus) display += '+';
            counter.textContent = display;
        }, 20);
    });
}

// Run counter animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        animateCounters();
        heroObserver.disconnect();
    }
});
heroObserver.observe(document.querySelector('.hero'));
