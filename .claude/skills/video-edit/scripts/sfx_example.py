import numpy as np, wave, sys
SR=48000; DUR=float(sys.argv[2]); out=np.zeros(int(SR*(DUR+1)))
rng=np.random.default_rng(7)
def add(t,s,g):
    i=int(max(0,t)*SR); out[i:i+len(s)]+=g*s[:len(out)-i]
def env(n,a=.005,r=None):
    t=np.arange(n)/SR; e=np.minimum(1,t/a); return e*np.exp(-t/(r or n/SR/4))
def whoosh(d=.45):
    n=int(d*SR); x=rng.standard_normal(n); t=np.arange(n)/SR
    # sweep a one-pole lowpass upward
    y=np.zeros(n); c=0
    for i in range(n):
        k=0.02+0.35*(t[i]/d); c+=k*(x[i]-c); y[i]=c
    return y*np.sin(np.pi*t/d)**2
def pop(f0=900,f1=250,d=.12):
    n=int(d*SR); t=np.arange(n)/SR; f=f1+(f0-f1)*np.exp(-t*40)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.03)
def ding(f=1318,d=.6):
    n=int(d*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.01*t))*env(n,.002,.15)
def thud(d=.3):
    n=int(d*SR); t=np.arange(n)/SR; f=120*np.exp(-t*8)+45
    return (np.sin(2*np.pi*np.cumsum(f)/SR)+.3*rng.standard_normal(n)*np.exp(-t*60))*env(n,.002,.08)
for t in [0.0,1.0,3.82,6.79,9.2,13.45,18.78]: add(t-.15,whoosh(),.35)
add(2.24,pop(),.35); add(3.07,thud(),.8); add(6.12,pop(1200,400,.15),.5); add(6.12,ding(1568),.25)
for i in range(7): add(7.1+i*.16,pop(1400+i*80,700,.06),.15)
add(9.9,ding(1760),.3); add(9.95,ding(2349),.2)
for t in [13.8,14.25,14.64]: add(t,ding(1046),.22)
add(16.42,pop(2000,1500,.04),.4)
for t in [17.29,17.59,18.07]: add(t,pop(),.3)
for i in range(5): add(19.7+i*.32,ding(1046*(1.122**i)),.18)
out=np.clip(out,-1,1); w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
