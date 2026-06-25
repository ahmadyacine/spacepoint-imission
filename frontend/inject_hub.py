import os
import glob
import re

d = r'c:\Users\ahmad yacine\Desktop\Merged-platforms-main\MissionPortal\frontend'
btn = '<a href="/home" class="flex items-center gap-2 text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border hover:bg-white/5 transition-colors whitespace-nowrap shrink-0" style="border-color:rgba(168,85,247,0.4);color:#c4a0e8;background:rgba(101,63,132,0.15);" title="Back to Hub"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span class="hidden sm:inline-block font-semibold">Hub</span></a> '

for f in glob.glob(os.path.join(d, '*.html')):
    if f.endswith('home.html') or f.endswith('auth.html'): 
        continue
    with open(f, 'r', encoding='utf-8') as file: 
        content = file.read()
    
    # We want to replace `<button onclick="logout()"` with `btn + <button ...`
    # We will use regex to catch any extra spaces or classes but matching the onclick exactly
    new_c = re.sub(r'(<button[^>]*?onclick="logout\(\)".*?>)', btn + r'\1', content)
    
    if new_c != content:
        with open(f, 'w', encoding='utf-8') as file: 
            file.write(new_c)
        print('Updated:', os.path.basename(f))
