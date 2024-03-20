function get_latest_frp() {
    [ -x "$(command -v jq)" ] || sudo apt-get install -y jq
    resp=$(curl -fsSLk "https://api.github.com/repos/fatedier/frp/releases/latest")
    platform=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    if [ "$arch" = "x86_64" ]; then
        url=$(echo $resp | jq -r '.assets[] | select(.name | test("'"$platform"'_amd64")) | .browser_download_url')
    else
        url=$(echo $resp | jq -r '.assets[] | select(.name | test("'"$platform"'_386")) | .browser_download_url')
    fi
    echo "$url"
}
function configure_frp() {
    echo "Fetching latest frp release..."
    local url=$(get_latest_frp)
    if [ -z "$url" ]; then
        echo "Error: No release found for $platform" && return 1
    else
        echo "Latest release: $url"
    fi
    local fn=$(basename "$url")
    local fn_noext="${fn%.*.*}"
    local tmp_dir=$(mktemp -d)
    echo "Downloading $fn..."
    wget -q --show-progress --no-check-certificate -O "$tmp_dir/$fn" "$url"
    echo "Extracting..."
    tar -zxf "$tmp_dir/$fn" -C "$tmp_dir"
    echo "Configuring..."
    sudo systemctl stop frps 2>/dev/null
    sudo systemctl stop frpc 2>/dev/null
    sudo mkdir -p /etc/frp
    sudo cp "$tmp_dir/$fn_noext/frpc.toml" "$tmp_dir/$fn_noext/frps.toml" -t /etc/frp/
    sudo cp "$tmp_dir/$fn_noext/frpc" "$tmp_dir/$fn_noext/frps" -t /usr/bin/
    sudo chmod a+x /usr/bin/frpc /usr/bin/frps
    sudo cat <<EOF > /etc/systemd/system/frps.service
[Unit]
Description=FRP Server Daemon
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/bin/frps -c /etc/frp/frps.toml
Restart=always
RestartSec=20s
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
EOF
    sudo cat <<EOF > /etc/systemd/system/frpc.service
[Unit]
Description=FRP Client Daemon
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart=/usr/bin/frpc -c /etc/frp/frpc.toml
Restart=always
RestartSec=20s
LimitNOFILE=infinity

[Install]
WantedBy=multi-user.target
EOF
    sudo systemctl daemon-reload
    rm -rf "$tmp_dir"
    echo "Done"
}
configure_frp
unset -f get_latest_frp configure_frp