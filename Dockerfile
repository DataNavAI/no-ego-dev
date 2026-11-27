# When adding an image tool, update scripts/container/test-tools.py and the tool inventory;
# see AGENTS.md "Container tool changes" for the native integration gates.

# AWS CLI v2: this official stage supplies the standalone aws installation copied below.
FROM amazon/aws-cli@sha256:bc6b7bba44ce38f9604ede49c584824af919047ea03fbcc7c7610671fdef95d8 AS aws-cli
# Hermes base supplies Bash/coreutils, Git/rg, curl/OpenSSH/OpenSSL, GCC/G++/Make,
# Python, Node/npm/npx, FFmpeg/ffprobe, browser-harness and Google Chrome for Testing,
# plus Hermes CLI/dashboard and s6 supervision. These tools are inherited, not installed here.
# Full inventory and verification: docs/features/standalone-container/TOOLS.md.
# Maintained official multi-arch Hermes image; registry evidence in RUNBOOK.md.
FROM nousresearch/hermes-agent@sha256:ef0650d523ee1b5ab32c779acabc446d9936869a9932591553688a62bcf0c42f AS subscription-runtime
USER root
WORKDIR /opt/ned
# install.py installs pinned Claude Code (claude), Antigravity (agy) and Hermes
# subscription-provider plugins from scripts/subscription-runtime/lock.json.
COPY scripts/subscription-runtime/ scripts/subscription-runtime/
RUN /opt/hermes/.venv/bin/python /opt/ned/scripts/subscription-runtime/install.py --hermes-root /opt/hermes --bin-dir /usr/local/bin
# Final NED image inherits Hermes and the installed subscription clients.
FROM subscription-runtime AS ned
# Copy AWS CLI v2 from its stage; ln exposes aws on PATH and --version checks the binary.
COPY --from=aws-cli /usr/local/aws-cli /usr/local/aws-cli
RUN ln -s /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws && aws --version
# Dedicated NED Python + PyYAML: profile initialization/dashboard patching, separate from Hermes Python.
RUN /usr/bin/python3 -m venv /opt/ned/python && /opt/ned/python/bin/pip install --no-cache-dir PyYAML==6.0.3
# npm ci installs NED Node dependencies; approve/rebuild compiles the better-sqlite3
# native binding; opening an in-memory database below checks that SQLite can load.
# npm cache clean only removes installation cache; it does not install another tool.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit && \
    npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3 && \
    node -e 'new (require("better-sqlite3"))(":memory:").close()' && \
    npm cache clean --force
# NED CLI launchers and shared application code.
COPY bin/ bin/
COPY src/ src/
# Build identity for ned --version and the UI; no additional tool is installed.
COPY scripts/stamp-version.mjs scripts/stamp-version.mjs
ARG NED_BUILD_REVISION
RUN node scripts/stamp-version.mjs "$NED_BUILD_REVISION"
# Core/COM applications, agent skills/workflows, Hermes plugin and evaluation runtime.
COPY apps/ apps/
COPY skills/ skills/
COPY workflows/ workflows/
COPY plugins/ned/ plugins/ned/
COPY eval_runner/ eval_runner/
COPY distribution.yaml SOUL.md AGENTS.md config.yaml README.md README.ko.md LICENSE .env.EXAMPLE ./
# Container setup, service adapters, health checks and offline tool integration probes.
COPY scripts/container/ scripts/container/
# expose-browser.py exposes inherited Chrome as google-chrome; no second browser download.
# patch-dashboard.py + py_compile patch/check the inherited Hermes dashboard.
# ln exposes the NED CLI as ned; setup initializes the persistent profile at container startup.
# run-com and the s6 entries register NED COM as a supervised service.
RUN /opt/ned/python/bin/python /opt/ned/scripts/container/expose-browser.py && \
    chmod -R a+rX /opt/ned && \
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
# Runtime wiring: dashboard/COM ports, authentication-required startup and persistent SQLite path.
ENV NED_CONTAINER=1 HERMES_DASHBOARD=1 HERMES_DASHBOARD_HOST=0.0.0.0 HERMES_DASHBOARD_PORT=9119 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 HERMES_SKIP_CONFIG_MIGRATION=1 NED_DATABASE_URL=/var/lib/ned/ned.sqlite \
    NED_COM_ORIGIN=http://127.0.0.1:8787
# Persistent Hermes profile, NED database and user projects; separate from immutable image tools.
VOLUME ["/opt/data", "/var/lib/ned", "/projects"]
EXPOSE 9119 8787
# Node health probe checks the dashboard and COM; the full tool suite runs on demand/in CI.
HEALTHCHECK --interval=15s --timeout=8s --start-period=90s --retries=3 CMD ["node", "/opt/ned/scripts/container/health.mjs"]
# Remove build-time profile state so fresh runtime volumes do not inherit sessions or credentials.
RUN find /opt/data -mindepth 1 -delete
WORKDIR /projects
# Upstream s6 supervises the real dashboard plus our COM service; CMD is heartbeat.
CMD ["sleep", "infinity"]
