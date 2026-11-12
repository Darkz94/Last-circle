#!/usr/bin/env python3
"""Builds game.html (the whole game in one file) from src/.
   python3 build.py          -> game.html
   python3 build.py --test   -> also writes /tmp/lc_test.js (game code with test hooks, for the simulation bots)
"""
import glob, sys, os
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(src, '*.js'))))
css = open(os.path.join(src, 'style.css')).read()
html = open(os.path.join(src, 'template.html')).read().replace('/*CSS*/', css).replace('/*JS*/', js)
open(os.path.join(root, 'game.html'), 'w').write(html)
print('game.html', len(html) // 1024, 'KB,', js.count('\n'), 'lines of JS')
if '--test' in sys.argv:
    open('/tmp/lc_test.js', 'w').write('(() => {\n"use strict";\n' + js + '\nglobalThis.__T = TEST_API();\n})();\n')
