"""Recorta as pranchas complementares do curso de Radiologia.

Os exames são preservados sem reconstrução generativa. Recortes menores recebem
apenas ampliação Lanczos e uma máscara de nitidez leve.
"""

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "radio-real" / "complementos"
SOURCES = {
    "s1": Path(r"D:\Usuário\Isaac Sotero\Desktop\1.png"),
    "s2": Path(r"D:\Usuário\Isaac Sotero\Desktop\2.png"),
    "s3": Path(r"D:\Usuário\Isaac Sotero\Desktop\3.png"),
    "s4": Path(r"D:\Usuário\Isaac Sotero\Desktop\4.png"),
}

# Caixa no formato Pillow: esquerda, topo, direita, base.
CROPS = {
    # Prancha 1 — sinais radiológicos prioritários.
    "avc-arteria-cerebral-media-hiperdensa": ("s1", (9, 5, 430, 301), 2),
    "avc-apagamento-nucleo-lentiforme": ("s1", (442, 5, 961, 301), 2),
    "avc-perda-faixa-insular": ("s1", (9, 337, 430, 626), 2),
    "avc-perda-diferenciacao-cortico-subcortical": ("s1", (440, 337, 961, 626), 2),
    "avc-apagamento-sulcos-cisternas": ("s1", (9, 663, 430, 944), 2),
    "redistribuicao-vascular-cefalizacao": ("s1", (438, 663, 961, 944), 2),
    "grao-cafe-volvo-sigmoide": ("s1", (9, 983, 430, 1249), 2),
    "rigler-dupla-parede": ("s1", (438, 983, 961, 1249), 2),
    "sulco-profundo": ("s1", (9, 1288, 413, 1571), 2),
    "sinal-silhueta": ("s1", (424, 1288, 961, 1571), 2),

    # Prancha 2 — atlas radiológico.
    "dupla-bolha": ("s2", (18, 10, 549, 429), 2),
    "raios-de-sol-sunburst": ("s2", (568, 10, 1098, 429), 2),
    "triangulo-codman": ("s2", (18, 482, 549, 889), 2),
    "coluna-bambu": ("s2", (568, 482, 1098, 889), 2),
    "vertebra-marfim": ("s2", (18, 943, 549, 1338), 2),
    "sinal-vela-cotovelo": ("s2", (568, 943, 1098, 1338), 2),

    # Prancha 3 — diferenciais e classificação de fraturas.
    "grao-cafe-invertido-volvo-ceco": ("s3", (13, 13, 378, 427), 2),
    "ligamento-falciforme": ("s3", (396, 13, 751, 427), 2),
    "chilaiditi": ("s3", (768, 13, 1109, 427), 2),
    "reacao-periosteal-casca-cebola": ("s3", (13, 507, 331, 922), 2),
    "trilho-de-trem": ("s3", (346, 507, 751, 922), 2),
    "corduroy-veludo": ("s3", (767, 507, 1109, 922), 2),
    "classificacao-visual-fraturas": ("s3", (10, 1006, 1111, 1338), 2),

    # Prancha 4 — sinais clínicos citados nas aulas.
    "triade-beck-pulso-paradoxal": ("s4", (260, 0, 603, 310), 3),
    # O terceiro quadro da prancha foi excluído: está rotulado como Jobert,
    # mas demonstra Rovsing. Mantemos apenas Blumberg e Murphy.
    "blumberg-murphy": ("s4", (610, 47, 920, 310), 3),
    "cullen-grey-turner": ("s4", (1094, 0, 1536, 310), 2),
    "fratura-base-cranio-sinais": ("s4", (0, 310, 399, 643), 2),
    # Remove os rótulos superiores da fonte, que repetiam "miose" sob ptose.
    # O recorte conserva a comparação ocular e a tríade correta no quadro inferior.
    "sindrome-horner": ("s4", (410, 410, 740, 643), 3),
    "papiledema": ("s4", (748, 310, 1042, 643), 3),
    "triade-cushing": ("s4", (1041, 310, 1302, 643), 3),
    "sinal-giordano": ("s4", (1301, 310, 1536, 643), 3),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    opened = {key: Image.open(path).convert("RGB") for key, path in SOURCES.items()}
    try:
        for name, (source_key, box, scale) in CROPS.items():
            crop = opened[source_key].crop(box)
            if scale > 1:
                crop = crop.resize(
                    (crop.width * scale, crop.height * scale),
                    Image.Resampling.LANCZOS,
                )
                crop = crop.filter(
                    ImageFilter.UnsharpMask(radius=1.0, percent=80, threshold=3)
                )
            crop = ImageOps.exif_transpose(crop)
            crop.save(OUT / f"{name}.webp", "WEBP", quality=94, method=6)
    finally:
        for image in opened.values():
            image.close()

    print(f"{len(CROPS)} recortes salvos em {OUT}")


if __name__ == "__main__":
    main()
