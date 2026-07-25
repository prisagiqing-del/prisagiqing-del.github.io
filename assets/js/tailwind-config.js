
        let twInt = setInterval(() => {
            if(typeof tailwind !== 'undefined') {
                tailwind.config = { darkMode: 'class', theme: { extend: { colors: { dark: '#0b1326', darker: '#050816', primary: '#fbbf24' } } } };
                clearInterval(twInt);
            }
        }, 100);
    