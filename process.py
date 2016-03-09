import csv
from operator import itemgetter
import json


def main():
    with open('atusresp_2014.csv') as f:
        r = csv.reader(f)
        next(r)  # Title row
        ids = set(map(itemgetter(0), r))
    with open('atusact_2014.csv') as f:
        r = csv.DictReader(f)
        raw = list(filter(lambda row: row['TUCASEID'] in ids, r))
        data = [{
            'startH': int(x['TUSTARTTIM'][:x['TUSTARTTIM'].index(':')]),
            'startM': int(x['TUSTARTTIM'][x['TUSTARTTIM'].index(':') + 1:-3]),
            'stopH': int(x['TUSTOPTIME'][:x['TUSTOPTIME'].index(':')]),
            'stopM': int(x['TUSTOPTIME'][x['TUSTOPTIME'].index(':') + 1:-3]),
            'actDur': int(x['TUACTDUR24']),
            'cumDur': int(x['TUCUMDUR24']),
            'type': int(x['TUTIER1CODE'])
        } for x in raw]
    with open('timeuse.json', 'w') as f:
        json.dump(data, f)

if __name__ == '__main__':
    main()
