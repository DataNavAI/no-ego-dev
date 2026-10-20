// Synthetic evaluation target, deliberately containing one arithmetic defect.
const args = process.argv.slice(2);
if (args[0] === '--help' && args.length === 1) {
  console.log('calc sum <a> <b>');
} else if (args[0] === 'sum' && args.length === 3 && args.slice(1).every(x => /^-?\d+$/.test(x))) {
  console.log(Math.abs(Number(args[1])) + Number(args[2]));
} else {
  console.error('Invalid command');
  process.exitCode = 2;
}
