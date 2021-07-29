const injectTooltipCss = (color: string, tagName: string): any => {
  const injectedStyle = `style='background: ${color}; .leaflet-tooltip: { padding: 0px !important; border: 1px solid ${color} !important; background-color: ${color} !important;}.leaflet-popup-tip { box-shadow: none !important; background-color: ${color} !important; }'
  .leaflet-tooltip-top:before { border-top-color: ${color};}
  .leaflet-tooltip-bottom:before { border-bottom-color: ${color};}
  .leaflet-tooltip-left:before { border-left-color: ${color};}
  .leaflet-tooltip-right:before {border-right-color: ${color};}
  `;

  return `<div ${injectedStyle}><span class="bp3-tag" color=${color}>${tagName}</span>`;
};

export default injectTooltipCss;
