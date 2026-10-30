"""SFX zsynchronizowane z obrazem: whoosh na każdym cięciu (edit.json z Blendera) + dźwięki zdarzeń przypięte do słów lektora."""
import json
e = json.load(open('edit.json')); ev = e['events']; tl = json.load(open('timeline.json'))
W = {w['w'].lower().strip('.,:?!'): w['s'] for w in tl['words']}
sfx = [{'type': 'whoosh', 't': c} for c in e['cuts']]
sfx += [{'type': 'beep', 't': ev['pik']}, {'type': 'success', 't': ev['zgoda']}, {'type': 'rise', 't': ev['zgoda'] - 0.05},
        {'type': 'power', 't': W['cewka']}, {'type': 'pop', 't': W['udawać']}, {'type': 'thud', 't': W['numeru'] + 0.75},
        {'type': 'click', 't': ev['token']}, {'type': 'click', 't': W['kod']}, {'type': 'power', 't': W['kilka']}]
sfx += [{'type': 'blip', 't': W['kod'] + 0.6 + i * 0.3} for i in range(5)]
sfx += [{'type': 'blip', 't': ev['bank'] - 0.3 + i * 0.28} for i in range(5)]
json.dump(sorted(sfx, key=lambda x: x['t']), open('sfx.json', 'w'), indent=0)
