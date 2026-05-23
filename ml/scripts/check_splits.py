from pathlib import Path

org = Path('alkasense_dataset/data/organized')
print(f'Looking in: {org.resolve()}')

if not org.exists():
    print('ERROR: Path does not exist')
else:
    for cls in sorted(org.iterdir()):
        if cls.is_dir():
            imgs = list(cls.glob('*.png')) + list(cls.glob('*.jpg')) + list(cls.glob('*.jpeg'))
            n = len(imgs)
            train = int(n * 0.60)
            val   = int(n * 0.20)
            test  = n - train - val
            if n < 3:
                flag = '  WARNING: TOO FEW - need at least 3'
            elif n < 5:
                flag = '  WARNING: LOW'
            else:
                flag = ''
            print(f'{cls.name}: {n} images  ->  train: {train}, val: {val}, test: {test}{flag}')