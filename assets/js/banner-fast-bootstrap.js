(function () {
    'use strict';

    const CACHE_KEY = 'tiketkaka_public_banners_v32';
    const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyBVgwGz3I7Sb3UYfNpnah5nt5skddnidGo',
        authDomain: 'tiketkaka.firebaseapp.com',
        databaseURL: 'https://tiketkaka-default-rtdb.asia-southeast1.firebasedatabase.app',
        projectId: 'tiketkaka',
        storageBucket: 'tiketkaka.firebasestorage.app',
        messagingSenderId: '246931943390',
        appId: '1:246931943390:web:285e17a4f64c210d3ef74f'
    };

    function normalizeBanners(value) {
        const source = Array.isArray(value)
            ? value
            : (value && typeof value === 'object'
                ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map(key => value[key])
                : []);

        return source.map(entry => {
            if (typeof entry === 'string') return { img: entry.trim(), url: '' };
            if (!entry || typeof entry !== 'object') return null;
            return {
                img: String(entry.img || '').trim(),
                url: String(entry.url || '').trim()
            };
        }).filter(entry => entry && entry.img);
    }

    function bannerSignature(banners) {
        return JSON.stringify(banners.map(entry => [entry.img, entry.url]));
    }

    function addResourceHint(url, rel) {
        try {
            const parsed = new URL(url, window.location.href);
            const href = rel === 'preconnect' ? parsed.origin : parsed.href;
            const duplicate = Array.from(document.head.querySelectorAll(`link[data-tiketkaka-banner-hint="${rel}"]`))
                .some(link => link.href === href || link.getAttribute('href') === href);
            if (duplicate) return;
            const link = document.createElement('link');
            link.rel = rel;
            link.href = href;
            link.setAttribute('data-tiketkaka-banner-hint', rel);
            if (rel === 'preload') {
                link.as = 'image';
                link.fetchPriority = 'high';
                link.setAttribute('fetchpriority', 'high');
            }
            document.head.appendChild(link);
        } catch (error) {
            console.warn('Banner resource hint skipped:', error);
        }
    }

    function persistBanners(banners) {
        try {
            if (!banners.length) {
                localStorage.removeItem(CACHE_KEY);
                return;
            }
            localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), banners }));
        } catch (error) {
            console.warn('Banner cache unavailable:', error);
        }
    }

    function renderBanners(value, options) {
        const settings = options || {};
        const banners = normalizeBanners(value);
        const slider = document.getElementById('top-ad-slider');
        const container = document.getElementById('top-ad-container');
        if (!slider || !container) return false;

        if (window.cachedSettings && typeof window.cachedSettings === 'object') {
            window.cachedSettings.banners = banners.map(entry => ({ ...entry }));
        }

        if (!banners.length) {
            if (window.topAdInterval) clearInterval(window.topAdInterval);
            window.topAdInterval = null;
            window.__tiketKakaBannerSignature = '';
            slider.innerHTML = '';
            slider.style.transform = '';
            container.classList.add('hidden');
            if (settings.persist !== false) persistBanners([]);
            return true;
        }

        const signature = bannerSignature(banners);
        if (window.__tiketKakaBannerSignature === signature && slider.children.length === banners.length) {
            container.classList.remove('hidden');
            if (settings.persist !== false) persistBanners(banners);
            return true;
        }

        addResourceHint(banners[0].img, 'preconnect');
        addResourceHint(banners[0].img, 'preload');

        if (window.topAdInterval) clearInterval(window.topAdInterval);
        window.topAdInterval = null;
        slider.innerHTML = '';
        slider.style.width = `${banners.length * 100}%`;
        slider.style.transform = 'translateX(0%)';
        const slideWidth = 100 / banners.length;

        banners.forEach((banner, index) => {
            const image = document.createElement('img');
            image.src = banner.img;
            image.alt = 'Banner';
            image.className = 'w-full h-full object-contain';
            image.style.width = '100%';
            image.style.height = '100%';
            image.style.objectFit = 'contain';
            image.decoding = 'async';
            image.setAttribute('decoding', 'async');
            image.loading = index === 0 ? 'eager' : 'lazy';
            image.setAttribute('loading', index === 0 ? 'eager' : 'lazy');
            image.fetchPriority = index === 0 ? 'high' : 'low';
            image.setAttribute('fetchpriority', index === 0 ? 'high' : 'low');

            const content = banner.url ? document.createElement('a') : document.createElement('div');
            if (banner.url) {
                content.href = banner.url;
                content.target = '_blank';
                content.rel = 'noopener noreferrer';
                content.className = 'flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity';
                content.style.width = '100%';
                content.style.height = '100%';
            } else {
                content.className = 'flex items-center justify-center w-full h-full';
            }
            content.appendChild(image);

            const slide = document.createElement('div');
            slide.className = 'relative flex-shrink-0 flex items-center justify-center bg-transparent';
            slide.style.width = `${slideWidth}%`;
            slide.style.height = '100%';
            slide.appendChild(content);
            slider.appendChild(slide);
        });

        window.__tiketKakaBannerSignature = signature;
        container.classList.remove('hidden');

        if (banners.length > 1) {
            let activeIndex = 0;
            window.topAdInterval = setInterval(() => {
                activeIndex = (activeIndex + 1) % banners.length;
                slider.style.transform = `translateX(-${(activeIndex * 100) / banners.length}%)`;
            }, 3500);
        }

        if (settings.persist !== false) persistBanners(banners);
        return true;
    }

    function loadCachedBanners() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return;
            const cached = JSON.parse(raw);
            if (!cached || !Array.isArray(cached.banners) || !Number.isFinite(Number(cached.savedAt))) return;
            if (Date.now() - Number(cached.savedAt) > CACHE_MAX_AGE) {
                localStorage.removeItem(CACHE_KEY);
                return;
            }
            renderBanners(cached.banners, { persist: false });
        } catch (error) {
            console.warn('Cached banner could not be loaded:', error);
        }
    }

    function attachRemoteBannerListener() {
        if (window.__tiketKakaBannerRemoteListenerAttached) return;
        if (typeof firebase === 'undefined' || !firebase.database) return;
        try {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            const bannerRef = firebase.database().ref('settings/banners');
            window.__tiketKakaBannerRemoteListenerAttached = true;
            window.__tiketKakaBannerRemoteRef = bannerRef;
            bannerRef.on('value', snapshot => {
                renderBanners(snapshot.val() || [], { persist: true });
            }, error => {
                console.warn('Banner Firebase listener failed:', error);
            });
        } catch (error) {
            console.warn('Banner fast loader initialization failed:', error);
        }
    }

    window.__tiketKakaBannerFastV32 = {
        cacheKey: CACHE_KEY,
        normalizeBanners,
        render: renderBanners,
        loadCached: loadCachedBanners,
        attachRemote: attachRemoteBannerListener
    };

    loadCachedBanners();
    attachRemoteBannerListener();
}());
