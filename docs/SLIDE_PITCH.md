# Por qué usamos MongoDB 

- Modelo documental: almacena auditorías y resultados JSON de forma natural, acelerando desarrollo y despliegues.
- Escala y operabilidad: escalado horizontal ((scaling out) consiste en añadir más nodos o servidores a un clúster para repartir la carga de trabajo, mejorando el rendimiento y la alta disponibilidad) y opciones gestionadas (Atlas); buen encaje con JS/TS y Mongoose.
- Consideraciones: no es óptimo para joins complejos ni análisis SQL intensivo; evaluar PostgreSQL/ElasticSearch si esas necesidades crecen.

Pros:

- Modelo documental: Guarda objetos JSON anidados directamente (audit, resultados Lighthouse) sin mapeos complicados.
Velocidad de desarrollo: Esquema flexible para iterar rápido en features y cambios de payload.
- Escalabilidad horizontal: Sharding y réplicas para cargas altas y alta disponibilidad.
- Buen encaje con JS/TS: DTOs/JSON del frontend/back y Mongoose facilitan el desarrollo.
- Operaciones de lectura/escritura por documento: Eficiente para historiales y logs append-only.
- Managed options: Atlas facilita backups, monitoring y escalado si se desea.

- Contras:

- No ideal para joins complejos: Consultas relacionales y análisis multi-tabla son menos naturales/óptimos.
- Consistencia y transaccionalidad: Aunque soporta transacciones, no es tan cómodo ni maduro como un RDBMS para ACID complejas.
- Uso de espacio y índices: Documentos grandes e índices mal planificados consumen memoria/espacio.
- Modelo flexible = posible inconsistencia: Sin schemas estrictos, pueden colarse datos inconsistentes si no se valida.
- Limitaciones analíticas: OLAP/consultas complejas son mejores en soluciones SQL o engines analíticos.
- Operación a gran escala: Requiere cuidado en configuración de shards/indices para evitar hotspots.

- Cuándo cambiar (puntos de decisión):

- Si la app necesita muchas relaciones complejas, integridad referencial y consultas SQL avanzadas → migrar a PostgreSQL.
- Si se prioriza búsqueda y agregación full‑text a gran escala → añadir ElasticSearch como complemento (no reemplazo).
- Si necesitas latencias microsegundo para datos transient → usar Redis/Cassandra para casos específicos.

- Alternativas breves:

- PostgreSQL: relaciones, consultas complejas, ACID fuerte (ideal si crece la necesidad relacional).
- ElasticSearch: búsqueda/analítica sobre resultados de auditoría.
- Redis / Cassandra: caching o ingest de telemetría de alta velocidad.