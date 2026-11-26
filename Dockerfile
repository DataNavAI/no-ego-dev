FROM amazon/aws-cli@sha256:bc6b7bba44ce38f9604ede49c584824af919047ea03fbcc7c7610671fdef95d8 AS aws-cli
# Maintained official multi-arch Hermes image; registry evidence in RUNBOOK.md.
FROM nousresearch/hermes-agent@sha256:ef0650d523ee1b5ab32c779acabc446d9936869a9932591553688a62bcf0c42f AS subscription-runtime
USER root
WORKDIR /opt/ned
COPY scripts/subscription-runtime/ scripts/subscription-runtime/
RUN /opt/hermes/.venv/bin/python /opt/ned/scripts/subscription-runtime/install.py --hermes-root /opt/hermes --bin-dir /usr/local/bin
FROM subscription-runtime AS ned
COPY --from=aws-cli /usr/local/aws-cli /usr/local/aws-cli
RUN ln -s /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws && aws --version
RUN /usr/bin/python3 -m venv /opt/ned/python && /opt/ned/python/bin/pip install --no-cache-dir PyYAML==6.0.3
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit && \
    npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3 && \
    node -e 'new (require("better-sqlite3"))(":memory:").close()' && \
    npm cache clean --force
COPY bin/ bin/
COPY src/ src/
COPY scripts/stamp-version.mjs scripts/stamp-version.mjs
ARG NED_BUILD_REVISION
RUN node scripts/stamp-version.mjs "$NED_BUILD_REVISION"
COPY apps/ apps/
COPY skills/ skills/
COPY workflows/ workflows/
COPY plugins/ned/ plugins/ned/
COPY eval_runner/ eval_runner/
COPY distribution.yaml SOUL.md AGENTS.md config.yaml README.md README.ko.md LICENSE .env.EXAMPLE ./
COPY scripts/container/ scripts/container/
RUN chmod -R a+rX /opt/ned && \
    /opt/ned/python/bin/python /opt/ned/scripts/container/patch-dashboard.py /opt/hermes/hermes_cli/web_server_dashboard.py && \
    /opt/hermes/.venv/bin/python -m py_compile /opt/hermes/hermes_cli/web_server_dashboard.py && \
    ln -s /opt/ned/bin/ned.js /usr/local/bin/ned && \
    chmod 0755 /opt/ned/scripts/container/setup /opt/ned/scripts/container/run-com && \
    cp /opt/ned/scripts/container/setup /etc/cont-init.d/01-hermes-setup && \
    mkdir -p /etc/s6-overlay/s6-rc.d/ned-com/dependencies.d && \
    printf 'longrun\n' > /etc/s6-overlay/s6-rc.d/ned-com/type && \
    cp /opt/ned/scripts/container/run-com /etc/s6-overlay/s6-rc.d/ned-com/run && \
    touch /etc/s6-overlay/s6-rc.d/user/contents.d/ned-com && \
    touch /etc/s6-overlay/s6-rc.d/ned-com/dependencies.d/base
ENV NED_CONTAINER=1 HERMES_DASHBOARD=1 HERMES_DASHBOARD_HOST=0.0.0.0 HERMES_DASHBOARD_PORT=9119 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 HERMES_SKIP_CONFIG_MIGRATION=1 NED_DATABASE_URL=/var/lib/ned/ned.sqlite \
    NED_COM_ORIGIN=http://127.0.0.1:8787
VOLUME ["/opt/data", "/var/lib/ned", "/projects"]
EXPOSE 9119 8787
HEALTHCHECK --interval=15s --timeout=8s --start-period=90s --retries=3 CMD ["node", "/opt/ned/scripts/container/health.mjs"]
RUN find /opt/data -mindepth 1 -delete
WORKDIR /projects
# Upstream s6 supervises the real dashboard plus our COM service; CMD is heartbeat.
CMD ["sleep", "infinity"]
