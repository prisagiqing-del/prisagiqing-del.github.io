
        let twInt = setInterval(() => {
            if(typeof tailwind !== 'undefined') {
                tailwind.config = { darkMode: 'class', theme: { extend: { colors: { dark: '#0f172a', darker: '#020617', primary: '#f59e0b' } } } };
                clearInterval(twInt);
            }
        }, 100);
    