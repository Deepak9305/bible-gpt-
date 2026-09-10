import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getRecentInsightDays, INSIGHT_PAGE_ORDER, type InsightPage, type InsightsData } from './insightsService';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

const formatDuration = (seconds: number) => {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const roundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) context.fillText(line, x, currentY);
  return currentY;
};

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    resolve(result.split(',')[1] || '');
  };
  reader.onerror = () => reject(reader.error || new Error('Could not prepare the share card.'));
  reader.readAsDataURL(blob);
});

const getWeeklyPageTotals = (data: InsightsData) => {
  const days = getRecentInsightDays(data);
  return INSIGHT_PAGE_ORDER.reduce<Record<InsightPage, number>>((totals, page) => {
    totals[page] = days.reduce((sum, day) => sum + day.pages[page], 0);
    return totals;
  }, {
    home: 0,
    chat: 0,
    library: 0,
    bookmarks: 0,
    journal: 0,
    settings: 0,
    insights: 0,
  });
};

const createShareCard = (data: InsightsData): Promise<Blob> => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    reject(new Error('Your device could not create the share card.'));
    return;
  }

  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, '#071b42');
  background.addColorStop(0.48, '#102b61');
  background.addColorStop(1, '#27135c');
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = context.createRadialGradient(835, 155, 10, 835, 155, 390);
  glow.addColorStop(0, 'rgba(93, 190, 255, 0.35)');
  glow.addColorStop(1, 'rgba(93, 190, 255, 0)');
  context.fillStyle = glow;
  context.fillRect(500, 0, 580, 500);

  // A few static stars keep the card atmospheric without loading any image assets.
  const stars = [[92, 188, 5], [180, 85, 3], [928, 98, 4], [995, 286, 3], [760, 336, 3], [420, 132, 2]];
  stars.forEach(([x, y, radius]) => {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(191, 231, 255, 0.8)';
    context.fill();
  });

  context.fillStyle = '#dbeafe';
  context.font = '700 30px Arial, sans-serif';
  context.letterSpacing = '4px';
  context.fillText('BIBLE NOVA', 84, 96);
  context.letterSpacing = '0px';

  context.strokeStyle = 'rgba(147, 197, 253, 0.8)';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(932, 68);
  context.lineTo(932, 122);
  context.moveTo(910, 90);
  context.lineTo(954, 90);
  context.stroke();

  context.fillStyle = '#93c5fd';
  context.font = '700 24px Arial, sans-serif';
  context.fillText('MY WEEK IN FAITH', 84, 230);

  context.fillStyle = '#ffffff';
  context.font = '700 76px Georgia, serif';
  context.fillText('Every quiet', 84, 328);
  context.fillText('moment counts.', 84, 418);

  context.fillStyle = 'rgba(219, 234, 254, 0.88)';
  context.font = '400 30px Arial, sans-serif';
  drawWrappedText(context, 'A small reflection from my time with God this week.', 84, 490, 820, 42);

  roundedRect(context, 64, 585, 952, 270, 34);
  context.fillStyle = 'rgba(4, 17, 52, 0.42)';
  context.fill();
  context.strokeStyle = 'rgba(147, 197, 253, 0.26)';
  context.lineWidth = 2;
  context.stroke();

  const weeklyDays = getRecentInsightDays(data);
  const weekSeconds = weeklyDays.reduce((sum, day) => sum + day.totalSeconds, 0);
  context.fillStyle = '#ffffff';
  context.font = '700 92px Arial, sans-serif';
  context.fillText(formatDuration(weekSeconds), 100, 700);
  context.fillStyle = '#bfdbfe';
  context.font = '400 28px Arial, sans-serif';
  context.fillText('spent in Bible Nova this week', 102, 748);

  context.fillStyle = '#93c5fd';
  context.font = '700 25px Arial, sans-serif';
  context.fillText(`${weeklyDays.filter((day) => day.totalSeconds > 0).length} active days`, 102, 807);
  context.fillText(`${data.sessions} total sessions`, 360, 807);

  const totals = getWeeklyPageTotals(data);
  const topPages = INSIGHT_PAGE_ORDER
    .map((page) => ({ page, seconds: totals[page] }))
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 3);

  context.fillStyle = '#dbeafe';
  context.font = '700 25px Arial, sans-serif';
  context.fillText('WHERE I SPENT TIME', 84, 957);

  const pageLabels: Record<InsightPage, string> = {
    home: 'Home',
    chat: 'Father AI',
    library: 'Bible reading',
    bookmarks: 'Saved verses',
    journal: 'Prayer journal',
    settings: 'Settings',
    insights: 'Insights',
  };
  const maxPageSeconds = Math.max(1, topPages[0]?.seconds || 1);
  topPages.forEach(({ page, seconds }, index) => {
    const y = 1018 + index * 64;
    context.fillStyle = '#ffffff';
    context.font = '600 28px Arial, sans-serif';
    context.fillText(pageLabels[page], 84, y);
    context.fillStyle = 'rgba(191, 219, 254, 0.35)';
    roundedRect(context, 320, y - 22, 470, 15, 8);
    context.fill();
    context.fillStyle = '#67e8f9';
    roundedRect(context, 320, y - 22, Math.max(18, (seconds / maxPageSeconds) * 470), 15, 8);
    context.fill();
    context.fillStyle = '#bfdbfe';
    context.font = '500 25px Arial, sans-serif';
    context.fillText(formatDuration(seconds), 830, y);
  });

  context.strokeStyle = 'rgba(191, 219, 254, 0.2)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(84, 1192);
  context.lineTo(996, 1192);
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = 'italic 32px Georgia, serif';
  context.fillText('“Be still, and know that I am God.”', 84, 1252);
  context.fillStyle = '#93c5fd';
  context.font = '600 22px Arial, sans-serif';
  context.fillText('Psalm 46:10  ·  biblenova.app', 84, 1300);

  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Your device could not export the share card.'));
  }, 'image/jpeg', 0.9);
});

export async function shareInsightsCard(data: InsightsData) {
  const blob = await createShareCard(data);
  const filename = 'bible-nova-week-in-faith.jpg';
  const shareTitle = 'My week in faith · Bible Nova';
  const shareText = 'A little reflection from my time with God this week. Shared from Bible Nova.';

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    const fileUri = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache,
    });
    await Share.share({
      title: shareTitle,
      text: shareText,
      files: [fileUri.uri || saved.uri],
      dialogTitle: 'Share your week in faith',
    });
    return { method: 'shared' as const };
  }

  const file = new File([blob], filename, { type: 'image/jpeg' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: shareTitle, text: shareText, files: [file] });
    return { method: 'shared' as const };
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { method: 'downloaded' as const };
}
