import csv
from operator import itemgetter


def main():
    with open('atusresp_2014.csv') as f:
        r = csv.reader(f)
        next(r)  # Title row
        ids = set(map(itemgetter(0), r))
    with open('atusact_2014.csv') as f:
        r = csv.DictReader(f)
        data = list(filter(lambda row: row['TUCASEID'] in ids, r))
        for i in range(len(data)):
            del data[i]['TUCASEID']
            # Remove ':00'
            data[i]['TUSTOPTIME'] = data[i]['TUSTOPTIME'][:-3]
            data[i]['TUSTARTTIM'] = data[i]['TUSTARTTIM'][:-3]
    with open('timeuse.csv', 'w') as f:
        w = csv.DictWriter(f, fieldnames=list(data[0].keys()))
        w.writeheader()
        w.writerows(data)

if __name__ == '__main__':
    main()
