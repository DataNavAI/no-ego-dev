import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import {registerIconLibrary} from '@awesome.me/webawesome/dist/components/icon/library.js';
import {enhanceProjectPicker} from './project-picker.js';

// WA's default system library fetches data: URLs. Keep the existing self-only
// CSP by resolving the two picker icons to fixed, same-origin SVG files.
registerIconLibrary('system',{
  resolver:name=>name==='check'?'/vendor/wa-check.svg':name==='chevron-down'?'/vendor/wa-chevron.svg':'',
  mutator:svg=>svg.setAttribute('fill','currentColor'),
});

void enhanceProjectPicker(document.getElementById('project'),{document,MutationObserver,customElements});
