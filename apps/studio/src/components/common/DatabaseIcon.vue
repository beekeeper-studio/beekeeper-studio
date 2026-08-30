<template>
  <span class="database-icon">
    <svg
      v-if="icon && typeof icon === 'object'"
      viewBox=" 0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      :aria-label="icon.title"
    >
      <path :d="icon.path" :fill="`#${icon.hex}`" />
    </svg>
    <img v-else-if="icon" :src="icon" :alt="type" />
    <i v-else class="material-icons-outlined default-icon">table_rows</i>
  </span>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import {
  siApachecassandra,
  siClickhouse,
  siCockroachlabs,
  siDuckdb,
  siGooglebigquery,
  siMariadb,
  siMongodb,
  type SimpleIcon,
  siMysql,
  siPostgresql,
  siRedis,
  siScylladb,
  siSnowflake,
  siSqlite,
  siSurrealdb,
  siTidb,
  siTrino,
} from "simple-icons";
import dynamodb from "devicon/icons/dynamodb/dynamodb-original.svg";
import firebird from "devicon/icons/firebird/firebird-original.svg";
import oracle from "devicon/icons/oracle/oracle-original.svg";
import sqlserver from "devicon/icons/microsoftsqlserver/microsoftsqlserver-original.svg";
import { ConnectionType } from "@/lib/db/types";

type DevIcon = string;

const icons: Record<ConnectionType, SimpleIcon | DevIcon | null> = {
  bigquery: siGooglebigquery,
  cassandra: siApachecassandra,
  clickhouse: siClickhouse,
  cockroachdb: siCockroachlabs,
  duckdb: siDuckdb,
  mariadb: siMariadb,
  mongodb: siMongodb,
  mysql: siMysql,
  postgresql: siPostgresql,
  redis: siRedis,
  scylladb: siScylladb,
  snowflake: siSnowflake,
  sqlite: siSqlite,
  surrealdb: siSurrealdb,
  tidb: siTidb,
  trino: siTrino,
  dynamodb,
  firebird,
  oracle,
  sqlserver,
  bedrock: null,
  greengage: null,
  libsql: null,
  redshift: null,
  sqlanywhere: null,
  starrocks: null,
};

export default Vue.extend({
  props: {
    type: {
      type: String as PropType<ConnectionType>,
      required: true,
    },
  },
  computed: {
    icon() {
      return icons[this.type] ?? null;
    },
  },
});
</script>

<style lang="scss" scoped>
svg,
img,
i {
  width: 1em;
  height: 1em;
}

i.material-icons {
  font-size: 1em;
}

.default-icon {
  color: hsl(from var(--theme-base) h s calc(l + 80));
}
</style>
