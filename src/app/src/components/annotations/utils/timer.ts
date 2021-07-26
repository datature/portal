const FormatTimerSeconds = (totalSeconds: number): string => {
  if (totalSeconds === Infinity) return "--:--";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minutesString = minutes < 10 ? `0${minutes}:` : `${minutes}:`;
  const secondsString = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutesString}${secondsString}`;
};

export default FormatTimerSeconds;
