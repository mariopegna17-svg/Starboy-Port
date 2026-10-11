"""Trace the illuminated screen in the supplied first-boot reference video.

Development-only tool: pip install numpy opencv-python-headless
Usage: python scripts/trace-boot.py reference.mp4 public/boot/sequence.json
The reference stays outside the repository. The app only loads vector paths.
"""

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np


def trace(mask, minimum=0.8):
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    result = []
    for contour in contours:
        if cv2.contourArea(contour) < minimum:
            continue
        points = cv2.approxPolyDP(contour, 0.8, True).reshape(-1, 2)
        if len(points) >= 3:
            result.append([round(float(value) * 2.5, 1) for value in points.flatten()])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    video = cv2.VideoCapture(str(args.video))
    fps = video.get(cv2.CAP_PROP_FPS)
    count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    if not video.isOpened() or fps <= 0 or count <= 0:
        raise ValueError('Cannot read reference video')

    # Camera movement is removed by tracking the outer screen ring, independently
    # of the animation inside it. Coordinates refer to this 576 x 1024 reference.
    anchors = []
    center = np.array([304.5, 502.5, 87.2])
    for index in range(0, count, 6):
        video.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = video.read()
        if not ok:
            raise ValueError(f'Missing frame {index}')
        roi = cv2.cvtColor(frame[370:635, 165:435], cv2.COLOR_BGR2GRAY)
        circles = cv2.HoughCircles(roi, cv2.HOUGH_GRADIENT, 1, 30,
                                  param1=100, param2=50, minRadius=75, maxRadius=92)
        if circles is not None:
            candidates = circles[0] + np.array([165, 370, 0])
            best = min(candidates, key=lambda c: np.linalg.norm(c[:2] - center[:2]) + abs(c[2] - 87) * 0.4)
            if np.linalg.norm(best[:2] - center[:2]) < 18:
                center = best
        anchors.append([index, *center])
    anchors = np.array(anchors)
    # Remove single-frame ring detection jitter without changing the contents.
    for column in range(1, 4):
        values = anchors[:, column].copy()
        for index in range(len(values)):
            anchors[index, column] = np.median(values[max(0, index - 2):index + 3])

    video.set(cv2.CAP_PROP_POS_FRAMES, 0)
    yy, xx = np.mgrid[:160, :160]
    inside = (xx - 80) ** 2 + (yy - 80) ** 2 < 77 ** 2
    frames = []
    pink = True
    palette = ['#e8bfd0', '#333036', '#9b8983', '#e7d0c6']
    smooth = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

    def color_id(rgb):
        color = '#' + ''.join(f'{int(value):02x}' for value in rgb)
        if color not in palette:
            palette.append(color)
        return palette.index(color)

    for index in range(count):
        ok, frame = video.read()
        if not ok:
            raise ValueError(f'Missing frame {index}')
        x, y, radius = [np.interp(index, anchors[:, 0], anchors[:, column]) for column in range(1, 4)]
        scale = 80 / (radius * 0.9)
        transform = np.array([[scale, 0, 80 - x * scale], [0, scale, 80 - y * scale]])
        if pink:
            source = frame[370:635, 165:435, ::-1].astype(np.int16)
            sr, sg, sb = source.transpose(2, 0, 1)
            pink_mask = ((sr > 165) & (sg > 120) & (sb > 145) & (sr - sg > 20) & (sb - sg > 5)).astype(np.uint8)
            contours, _ = cv2.findContours(pink_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            if contours:
                contour = max(contours, key=cv2.contourArea)
                if cv2.contourArea(contour) > 15000 and len(contour) > 100:
                    (cx, cy), (w, h), angle = cv2.fitEllipse(contour)
                    angle = np.deg2rad(angle)
                    rotation = np.array([[np.cos(angle), np.sin(angle)], [-np.sin(angle), np.cos(angle)]])
                    basis = rotation.T @ np.diag([160 / w, 160 / h]) @ rotation
                    transform = np.column_stack([basis, np.array([80, 80]) - basis @ np.array([cx + 165, cy + 370])])
        raw_rgb = cv2.cvtColor(cv2.warpAffine(frame, transform, (160, 160)), cv2.COLOR_BGR2RGB)
        rgb = raw_rgb
        rgb = cv2.GaussianBlur(rgb, (3, 3), 0.6)
        r, g, b = rgb.astype(np.int16).transpose(2, 0, 1)
        pink_pixels = inside & (r > 165) & (g > 120) & (b > 145) & (r - g > 20) & (b - g > 5)
        if pink and index / fps > 14 and pink_pixels.sum() < 150:
            pink = False
        groups = []
        if pink:
            dot = inside & (r < 135) & (g < 130) & (b < 135)
            paths = trace(dot)
            if paths:
                groups.append([1, paths])
            phase, background = 'seed', 0
        elif index / fps < 29.4:
            halo = inside & (r > 125) & (g > 110) & (b > 105) & (r - g > 6)
            light = inside & (r > 180) & (g > 155) & (b > 145)
            for mask, color in [(halo, 2), (light, 3)]:
                paths = trace(cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, smooth), 1)
                if paths:
                    groups.append([color, paths])
            phase, background = 'birth', -1
        else:
            hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
            luminous = inside & (((hsv[:, :, 1] > 90) & (hsv[:, :, 2] > 130)) |
                                ((r > 175) & (g > 145) & (b > 130)))
            if luminous.sum() < 25:
                # The closed eyelids are single-pixel curves in the recording;
                # retain their unblurred light instead of treating them as noise.
                hsv = cv2.cvtColor(raw_rgb, cv2.COLOR_RGB2HSV)
                r, g, b = raw_rgb.astype(np.int16).transpose(2, 0, 1)
                fine_inside = (xx - 80) ** 2 + (yy - 80) ** 2 < 72 ** 2
                luminous = fine_inside & (((hsv[:, :, 1] > 90) & (hsv[:, :, 2] > 130)) |
                                           ((r > 175) & (g > 145) & (b > 130)))
            # Quantize flat OLED colours, avoiding camera noise and reflections.
            hue, saturation = hsv[:, :, 0], hsv[:, :, 1]
            bands = [(0, 10, [205, 61, 20]), (10, 24, [250, 126, 8]),
                     (24, 42, [227, 210, 133]), (42, 85, [66, 155, 70]),
                     (85, 103, [18, 189, 193]), (103, 124, [39, 63, 204]),
                     (124, 150, [133, 79, 218]), (150, 180, [232, 61, 187])]
            regions = [(luminous & (saturation < 70), [231, 208, 198])]
            regions.extend((luminous & (saturation >= 70) & (hue >= low) & (hue < high), color)
                           for low, high, color in bands)
            for region, color in regions:
                mask = cv2.morphologyEx(region.astype(np.uint8), cv2.MORPH_CLOSE, smooth)
                # Small holes are compression/reflection noise; actual pupils
                # remain as holes or as their independently traced colour.
                holes, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
                if hierarchy is not None:
                    for hole, relation in zip(holes, hierarchy[0]):
                        if relation[3] >= 0 and cv2.contourArea(hole) < 12:
                            cv2.drawContours(mask, [hole], -1, 1, cv2.FILLED)
                paths = trace(mask, 0)
                if paths:
                    groups.append([color_id(color), paths])
            phase, background = 'eyes', -1
        frames.append([background, groups, phase])
    video.release()
    sequence = {'version': 1, 'size': 400, 'fps': fps, 'duration': round(count / fps * 1000),
                'sourceSha256': hashlib.sha256(args.video.read_bytes()).hexdigest(),
                'palette': palette, 'frames': frames}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(sequence, separators=(',', ':')) + '\n')
    temporary.replace(args.output)
    print(f'{len(frames)} frames, {len(palette)} colours, {args.output.stat().st_size} bytes')


if __name__ == '__main__':
    main()
