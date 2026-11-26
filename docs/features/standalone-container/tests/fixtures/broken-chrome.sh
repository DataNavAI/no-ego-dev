#!/bin/sh
if [ "$NED_BROWSER_FIXTURE" = missing ]; then exit 127; fi
if [ "$1" = --version ]; then
  printf 'Google Chrome for Testing 0.0.0.0\n'
else
  printf '<html><body><output id="result">pending</output></body></html>\n'
fi
