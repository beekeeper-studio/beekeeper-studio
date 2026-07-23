#!/bin/bash
# Boots the StarRocks all-in-one container and loads the "shared-nothing" quick
# start sample data (quickstart.crashdata / quickstart.weatherdata).
# See https://docs.starrocks.io/docs/quick_start/shared-nothing/
#
# This runs as the container command, layered on top of the image's normal
# startup: ./entrypoint.sh is launched in the background, then the data is
# loaded over localhost (so the stream-load redirect to 127.0.0.1:8040 works),
# and finally we wait on the StarRocks process so the container stays alive.
set -u

DEPLOY_DIR="/data/deploy"
SR_QUERY_PORT="9030"
SR_HTTP_PORT="8030"
DATASET_BASE="https://raw.githubusercontent.com/StarRocks/demo/master/documentation-samples/quickstart/datasets"

MYSQL="mysql -h 127.0.0.1 -P $SR_QUERY_PORT -u root --skip-column-names"

# Start StarRocks (FE + BE) using the image's own entrypoint.
cd "$DEPLOY_DIR"
./entrypoint.sh &
SR_PID=$!

load_sample_data() {
  echo "[init] Waiting for StarRocks FE on 127.0.0.1:$SR_QUERY_PORT..."
  until $MYSQL -e "SELECT 1" >/dev/null 2>&1; do
    sleep 2
  done

  echo "[init] Waiting for at least one backend to come alive..."
  until [ "$($MYSQL -e "SHOW BACKENDS" 2>/dev/null | grep -ci 'true')" -ge 1 ]; do
    sleep 2
  done

  # Idempotency: skip the download + load if the data is already present
  # (e.g. on a restart with a persisted volume).
  ROWS="$($MYSQL -e "SELECT COUNT(*) FROM quickstart.crashdata" 2>/dev/null || echo 0)"
  if [ "${ROWS:-0}" -gt 0 ]; then
    echo "[init] Sample data already loaded (crashdata has $ROWS rows). Skipping."
    return 0
  fi

  echo "[init] Creating database and tables..."
  $MYSQL <<'SQL'
CREATE DATABASE IF NOT EXISTS quickstart;

CREATE TABLE IF NOT EXISTS quickstart.crashdata (
    CRASH_DATE DATETIME,
    BOROUGH STRING,
    ZIP_CODE STRING,
    LATITUDE INT,
    LONGITUDE INT,
    LOCATION STRING,
    ON_STREET_NAME STRING,
    CROSS_STREET_NAME STRING,
    OFF_STREET_NAME STRING,
    CONTRIBUTING_FACTOR_VEHICLE_1 STRING,
    CONTRIBUTING_FACTOR_VEHICLE_2 STRING,
    COLLISION_ID INT,
    VEHICLE_TYPE_CODE_1 STRING,
    VEHICLE_TYPE_CODE_2 STRING
);

CREATE TABLE IF NOT EXISTS quickstart.weatherdata (
    DATE DATETIME,
    NAME STRING,
    HourlyDewPointTemperature STRING,
    HourlyDryBulbTemperature STRING,
    HourlyPrecipitation STRING,
    HourlyPresentWeatherType STRING,
    HourlyPressureChange STRING,
    HourlyPressureTendency STRING,
    HourlyRelativeHumidity STRING,
    HourlySkyConditions STRING,
    HourlyVisibility STRING,
    HourlyWetBulbTemperature STRING,
    HourlyWindDirection STRING,
    HourlyWindGustSpeed STRING,
    HourlyWindSpeed STRING
);
SQL

  cd /tmp
  echo "[init] Downloading NYC crash dataset..."
  curl -fsSL -O "$DATASET_BASE/NYPD_Crash_Data.csv"
  echo "[init] Downloading weather dataset..."
  curl -fsSL -O "$DATASET_BASE/72505394728.csv"

  echo "[init] Stream loading crash data..."
  curl --location-trusted -u root: \
      -T ./NYPD_Crash_Data.csv \
      -H "label:crashdata-0" \
      -H "column_separator:," \
      -H "skip_header:1" \
      -H "enclose:\"" \
      -H "max_filter_ratio:1" \
      -H "columns:tmp_CRASH_DATE, tmp_CRASH_TIME, CRASH_DATE=str_to_date(concat_ws(' ', tmp_CRASH_DATE, tmp_CRASH_TIME), '%m/%d/%Y %H:%i'),BOROUGH,ZIP_CODE,LATITUDE,LONGITUDE,LOCATION,ON_STREET_NAME,CROSS_STREET_NAME,OFF_STREET_NAME,NUMBER_OF_PERSONS_INJURED,NUMBER_OF_PERSONS_KILLED,NUMBER_OF_PEDESTRIANS_INJURED,NUMBER_OF_PEDESTRIANS_KILLED,NUMBER_OF_CYCLIST_INJURED,NUMBER_OF_CYCLIST_KILLED,NUMBER_OF_MOTORIST_INJURED,NUMBER_OF_MOTORIST_KILLED,CONTRIBUTING_FACTOR_VEHICLE_1,CONTRIBUTING_FACTOR_VEHICLE_2,CONTRIBUTING_FACTOR_VEHICLE_3,CONTRIBUTING_FACTOR_VEHICLE_4,CONTRIBUTING_FACTOR_VEHICLE_5,COLLISION_ID,VEHICLE_TYPE_CODE_1,VEHICLE_TYPE_CODE_2,VEHICLE_TYPE_CODE_3,VEHICLE_TYPE_CODE_4,VEHICLE_TYPE_CODE_5" \
      -XPUT "http://127.0.0.1:$SR_HTTP_PORT/api/quickstart/crashdata/_stream_load"

  echo
  echo "[init] Stream loading weather data..."
  curl --location-trusted -u root: \
      -T ./72505394728.csv \
      -H "label:weather-0" \
      -H "column_separator:," \
      -H "skip_header:1" \
      -H "enclose:\"" \
      -H "max_filter_ratio:1" \
      -H "columns: STATION, DATE, LATITUDE, LONGITUDE, ELEVATION, NAME, REPORT_TYPE, SOURCE, HourlyAltimeterSetting, HourlyDewPointTemperature, HourlyDryBulbTemperature, HourlyPrecipitation, HourlyPresentWeatherType, HourlyPressureChange, HourlyPressureTendency, HourlyRelativeHumidity, HourlySkyConditions, HourlySeaLevelPressure, HourlyStationPressure, HourlyVisibility, HourlyWetBulbTemperature, HourlyWindDirection, HourlyWindGustSpeed, HourlyWindSpeed, Sunrise, Sunset, DailyAverageDewPointTemperature, DailyAverageDryBulbTemperature, DailyAverageRelativeHumidity, DailyAverageSeaLevelPressure, DailyAverageStationPressure, DailyAverageWetBulbTemperature, DailyAverageWindSpeed, DailyCoolingDegreeDays, DailyDepartureFromNormalAverageTemperature, DailyHeatingDegreeDays, DailyMaximumDryBulbTemperature, DailyMinimumDryBulbTemperature, DailyPeakWindDirection, DailyPeakWindSpeed, DailyPrecipitation, DailySnowDepth, DailySnowfall, DailySustainedWindDirection, DailySustainedWindSpeed, DailyWeather, MonthlyAverageRH, MonthlyDaysWithGT001Precip, MonthlyDaysWithGT010Precip, MonthlyDaysWithGT32Temp, MonthlyDaysWithGT90Temp, MonthlyDaysWithLT0Temp, MonthlyDaysWithLT32Temp, MonthlyDepartureFromNormalAverageTemperature, MonthlyDepartureFromNormalCoolingDegreeDays, MonthlyDepartureFromNormalHeatingDegreeDays, MonthlyDepartureFromNormalMaximumTemperature, MonthlyDepartureFromNormalMinimumTemperature, MonthlyDepartureFromNormalPrecipitation, MonthlyDewpointTemperature, MonthlyGreatestPrecip, MonthlyGreatestPrecipDate, MonthlyGreatestSnowDepth, MonthlyGreatestSnowDepthDate, MonthlyGreatestSnowfall, MonthlyGreatestSnowfallDate, MonthlyMaxSeaLevelPressureValue, MonthlyMaxSeaLevelPressureValueDate, MonthlyMaxSeaLevelPressureValueTime, MonthlyMaximumTemperature, MonthlyMeanTemperature, MonthlyMinSeaLevelPressureValue, MonthlyMinSeaLevelPressureValueDate, MonthlyMinSeaLevelPressureValueTime, MonthlyMinimumTemperature, MonthlySeaLevelPressure, MonthlyStationPressure, MonthlyTotalLiquidPrecipitation, MonthlyTotalSnowfall, MonthlyWetBulb, AWND, CDSD, CLDD, DSNW, HDSD, HTDD, NormalsCoolingDegreeDay, NormalsHeatingDegreeDay, ShortDurationEndDate005, ShortDurationEndDate010, ShortDurationEndDate015, ShortDurationEndDate020, ShortDurationEndDate030, ShortDurationEndDate045, ShortDurationEndDate060, ShortDurationEndDate080, ShortDurationEndDate100, ShortDurationEndDate120, ShortDurationEndDate150, ShortDurationEndDate180, ShortDurationPrecipitationValue005, ShortDurationPrecipitationValue010, ShortDurationPrecipitationValue015, ShortDurationPrecipitationValue020, ShortDurationPrecipitationValue030, ShortDurationPrecipitationValue045, ShortDurationPrecipitationValue060, ShortDurationPrecipitationValue080, ShortDurationPrecipitationValue100, ShortDurationPrecipitationValue120, ShortDurationPrecipitationValue150, ShortDurationPrecipitationValue180, REM, BackupDirection, BackupDistance, BackupDistanceUnit, BackupElements, BackupElevation, BackupEquipment, BackupLatitude, BackupLongitude, BackupName, WindEquipmentChangeDate" \
      -XPUT "http://127.0.0.1:$SR_HTTP_PORT/api/quickstart/weatherdata/_stream_load"

  echo
  echo "[init] Done. Row counts:"
  $MYSQL -e "SELECT 'crashdata' AS tbl, COUNT(*) AS row_count FROM quickstart.crashdata
             UNION ALL
             SELECT 'weatherdata', COUNT(*) FROM quickstart.weatherdata"
}

# Load in the background so it never blocks/kills the DB; then keep the
# container alive by waiting on the StarRocks process.
load_sample_data || echo "[init] Sample data load failed (continuing; DB stays up)." &

wait $SR_PID
