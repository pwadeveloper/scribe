import json, sys
import numpy as np, librosa
path = sys.argv[1]
y, sr = librosa.load(path, sr=22050, mono=True)
dur = len(y) / sr
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time', tightness=100)
tempo = float(np.atleast_1d(tempo)[0])
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
times = librosa.times_like(onset_env, sr=sr)
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time', backtrack=False)
# Loudness per 0.25s and per beat
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
rt = librosa.times_like(rms, sr=sr, hop_length=512)
def rms_at(t0, t1):
    m = (rt >= t0) & (rt < t1)
    return float(rms[m].mean()) if m.any() else 0.0
# Low-end (kick) strength per beat via a low-pass onset
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
low = S[freqs < 150].sum(axis=0)
low_flux = np.maximum(0, np.diff(low, prepend=low[0]))
hi = S[freqs > 4000].sum(axis=0)
hi_flux = np.maximum(0, np.diff(hi, prepend=hi[0]))
st = librosa.times_like(low, sr=sr, hop_length=512)
def peak_near(arr, t, w=0.06):
    m = (st >= t - w) & (st <= t + w)
    return float(arr[m].max()) if m.any() else 0.0
lowmax, himax = low_flux.max(), hi_flux.max()
beat_info = []
for i, b in enumerate(beats):
    nb = beats[i + 1] if i + 1 < len(beats) else dur
    beat_info.append({
        'i': i, 't': round(float(b), 3),
        'rms': round(rms_at(b, nb), 4),
        'kick': round(peak_near(low_flux, b) / lowmax, 3),
        'hat': round(peak_near(hi_flux, b) / himax, 3),
    })
# Coarse energy sections (2s windows)
sections = [{'t': float(t), 'rms': round(rms_at(t, t + 2), 4)} for t in np.arange(0, dur, 2.0)]
out = {'duration': round(dur, 3), 'tempo': round(tempo, 2), 'beats': beat_info,
       'onsets': [round(float(o), 3) for o in onsets], 'sections': sections}
json.dump(out, open('/private/tmp/inkvid/beats.json', 'w'), indent=1, default=float)
print('duration', round(dur, 2), 'tempo', round(tempo, 2), 'beats', len(beats), 'onsets', len(onsets))
print('first beats', [round(float(b), 2) for b in beats[:12]])
print('beat interval median', round(float(np.median(np.diff(beats))), 4))
print('energy (2s windows):')
mx = max(s['rms'] for s in sections)
for s in sections:
    print(f"  {s['t']:5.1f}s {'#' * int(40 * s['rms'] / mx)}")
