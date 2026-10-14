# Maintained official multi-arch Hermes image; registry evidence in RUNBOOK.md.
FROM nousresearch/hermes-agent@sha256:c69536a39e885b8943329bda68cdf44492458b96aa74a212239bde9d2aeb406a
USER root
WORKDIR /opt/ned
RUN /usr/bin/python3 -m venv /opt/ned/python && /opt/ned/python/bin/pip install --no-cache-dir PyYAML==6.0.3
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit && \
    npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3 && \
    node -e 'new (require("better-sqlite3"))(":memory:").close()' && \
    npm cache clean --force
COPY bin/ bin/
COPY src/ src/
COPY skills/ skills/
COPY eval_runner/ eval_runner/
COPY distribution.yaml SOUL.md AGENTS.md config.yaml README.md README.ko.md LICENSE .env.EXAMPLE ./
COPY scripts/container/ scripts/container/
RUN ln -s /opt/ned/bin/ned.js /usr/local/bin/ned && \
    chmod 0755 /opt/ned/scripts/container/setup /opt/ned/scripts/container/run-com && \
    cp /opt/ned/scripts/container/setup /etc/cont-init.d/01-hermes-setup && \
    mkdir -p /etc/s6-overlay/s6-rc.d/ned-com/dependencies.d && \
    printf 'longrun\n' > /etc/s6-overlay/s6-rc.d/ned-com/type && \
    cp /opt/ned/scripts/container/run-com /etc/s6-overlay/s6-rc.d/ned-com/run && \
    touch /etc/s6-overlay/s6-rc.d/user/contents.d/ned-com && \
    touch /etc/s6-overlay/s6-rc.d/ned-com/dependencies.d/base
ENV HERMES_DASHBOARD=1 HERMES_DASHBOARD_HOST=0.0.0.0 HERMES_DASHBOARD_PORT=9119 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 HERMES_SKIP_CONFIG_MIGRATION=1 NED_DATABASE_URL=/var/lib/ned/ned.sqlite \
    NED_COM_ORIGIN=http://127.0.0.1:8787
VOLUME ["/opt/data", "/var/lib/ned", "/projects"]
EXPOSE 9119 8787
HEALTHCHECK --interval=15s --timeout=8s --start-period=90s --retries=3 CMD ["node", "/opt/ned/scripts/container/health.mjs"]
RUN find /opt/data -mindepth 1 -delete
WORKDIR /projects
# Upstream s6 supervises the real dashboard plus our COM service; CMD is heartbeat.
CMD ["sleep", "infinity"]
