import { CellComponent } from 'tabulator-tables';
import { Magic } from '../../Magic';
import { MagicColumn } from '../../MagicColumn';

/**
 * UnixTimeMagic - Formats Unix timestamps as readable dates.
 *
 * Flags:
 * - Timezone: utc (default: local)
 * - Scale: s, ms, us, ns (default: s)
 * - Format: iso (default: locale string)
 *
 * Example usage:
 * - created_at__format__unixtime
 * - timestamp__format__unixtime__utc__ms__iso
 * - time__format__unixtime__ns__utc
 *
 * Flags can be provided in any order. When multiple flags of the same category
 * are present, the last one wins.
 */

const SCALES = ['s', 'ms', 'us', 'ns'];

function parseFlags(args: string[]): {
  useUtc: boolean;
  scale: string;
  useIso: boolean;
} {
  const flags = args.slice(3).map((arg) => arg.toLowerCase());

  let useUtc = false;
  let scale = 's';
  let useIso = false;

  for (const flag of flags) {
    if (flag === 'utc') {
      useUtc = true;
    } else if (flag === 'iso') {
      useIso = true;
    } else if (SCALES.includes(flag)) {
      scale = flag;
    }
  }

  return { useUtc, scale, useIso };
}

function convertToMs(value: number, scale: string): number {
  switch (scale) {
    case 's':
      return value * 1000;
    case 'ms':
      return value;
    case 'us':
      return Math.floor(value / 1000);
    case 'ns':
      return Math.floor(value / 1000000);
    default:
      return value * 1000;
  }
}

function formatDate(value: number, useUtc: boolean, useIso: boolean): string {
  try {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return 'NaN';
    }

    if (useIso) {
      return date.toISOString();
    } else {
      const locale = window.platformInfo?.locale || 'en-US';
      const formatterOptions: Intl.DateTimeFormatOptions = {
        dateStyle: 'short',
        timeStyle: 'medium'
      };

      if (useUtc) {
        formatterOptions.timeZone = 'UTC';
      }
      const format = new Intl.DateTimeFormat(locale, formatterOptions);

      return format.format(date);
    }
  } catch {
    return 'NaN';
  }
}

const UnixTimeMagic: Magic = {
  name: 'UnixTimeMagic',
  initializers: ['unixtime', 'unix', 'timestamp'],
  autocompleteHints: [...SCALES, 'utc', 'iso'],
  render: function (args: string[]): MagicColumn {
    const { useUtc, scale, useIso } = parseFlags(args);

    return {
      title: args[0],
      formatter: (cell: CellComponent) => {
        const value = cell.getValue();
        const numValue = Number(value);

        if (isNaN(numValue)) {
          return 'NaN';
        }

        const msValue = convertToMs(numValue, scale);
        return formatDate(msValue, useUtc, useIso);
      },
    };
  },
};

export default UnixTimeMagic;
