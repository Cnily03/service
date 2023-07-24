echo && echo "[ Basic OpenWrt Components Installations ]"

# Prepare basic environment and requirements
echo && echo "===== Preparing basic environment and requirements"
hash=$(echo $(date +%s%N).SALT-OPENWRT-BASIC | md5sum | sed 's/[^0-9a-zA-Z]//g' | cut -c 1-8)
tempdir="$(pwd)/__temp.$hash"
mkdir -p ${tempdir} && cd ${tempdir}
# Install wget and ca-certificates
cp /etc/opkg/distfeeds.conf ${tempdir}/distfeeds.conf && \
sed -i -E "s/https?:\/\/downloads.openwrt.org/http:\/\/downloads.openwrt.org/g;" /etc/opkg/distfeeds.conf
opkg update
opkg install wget ca-certificates coreutils-nohup
rm -rf /etc/opkg/distfeeds.conf
mv ${tempdir}/distfeeds.conf /etc/opkg/distfeeds.conf

# Install Argon Theme
echo && echo "===== Installing Argon Theme"
# Update opkg list
echo "- Updating opkg list"
opkg update
# Install for OpenWrt official SnapShots and ImmortalWrt
echo "- Installing Argon Theme for OpenWrt official SnapShots and ImmortalWrt"
opkg install luci-compat luci-lib-ipkg
wget --no-check-certificate https://ghproxy.com/https://github.com/jerrykuku/luci-theme-argon/releases/download/v2.3/luci-theme-argon_2.3_all.ipk && \
opkg install luci-theme-argon*.ipk
# Install luci-app-argon-config
echo "- Installing luci-app-argon-config"
wget --no-check-certificate https://ghproxy.com/https://github.com/jerrykuku/luci-app-argon-config/releases/download/v0.9/luci-app-argon-config_0.9_all.ipk && \
opkg install luci-app-argon-config*.ipk

# Install language for zh-cn
echo && echo "===== Installing language for zh-cn"
# Update opkg list
echo "- Updating opkg list"
opkg update
# Install language
echo "- Installing language"
opkg install luci-i18n-base-zh-cn luci-i18n-opkg-zh-cn luci-i18n-firewall-zh-cn

# Install openClash
echo && echo "===== Installing openClash"
# Update opkg list
echo "- Updating opkg list"
opkg update
# Install openClash dependencies
echo "- Installing openClash dependencies"
opkg install coreutils-nohup bash iptables dnsmasq-full curl ca-certificates ipset ip-full iptables-mod-tproxy iptables-mod-extra libcap libcap-bin ruby ruby-yaml kmod-tun kmod-inet-diag unzip luci-compat luci luci-base --force-overwrite
# Install openClash ipk
echo "- Installing openClash ipk"
wget --no-check-certificate https://ghproxy.com/https://raw.githubusercontent.com/vernesong/OpenClash/package/master/luci-app-openclash_0.45.121-beta_all.ipk && \
opkg install luci-app-openclash*.ipk --force-overwrite
mkdir -p /etc/openclash/core
# Install openClash core clash
echo "- Installing openClash core clash"
wget --no-check-certificate https://ghproxy.com/https://raw.githubusercontent.com/vernesong/OpenClash/core/master/dev/clash-linux-arm64.tar.gz && \
tar zxvf clash-linux-arm64.tar.gz -C /etc/openclash/core && rm -rf clash-linux-arm64.tar.gz && \
chmod +x /etc/openclash/core/clash
# Install openClash core clash_tun
echo "- Installing openClash core clash_tun"
wget --no-check-certificate https://ghproxy.com/https://raw.githubusercontent.com/vernesong/OpenClash/core/master/premium/clash-linux-arm64-2023.04.16-20-g212da6a.gz && \
gunzip -d clash-linux-arm64-2023.04.16-20-g212da6a.gz && \
mv clash-linux-arm64-2023.04.16-20-g212da6a /etc/openclash/core/clash_tun && \
chmod +x /etc/openclash/core/clash_tun
# Install openClash core clash_meta
echo "- Installing openClash core clash_meta"
wget --no-check-certificate https://ghproxy.com/https://raw.githubusercontent.com/vernesong/OpenClash/core/master/meta/clash-linux-arm64.tar.gz && \
tar zxvf clash-linux-arm64.tar.gz && rm -rf clash-linux-arm64.tar.gz && \
mv clash /etc/openclash/core/clash_meta && \
chmod +x /etc/openclash/core/clash_meta

# Install utilities
echo && echo "===== Installing utilities"
# Update opkg list
echo "- Updating opkg list"
opkg update
# Install block-mount
echo "- Installing block-mount"
opkg install block-mount
# Install USB utilities
echo "- Installing USB utilities"
opkg install kmod-usb-core kmod-usb-ohci kmod-usb-uhci kmod-usb2 kmod-usb-storage usbutils
# Install management utilities and file system utilities
echo "- Installing management utilities and file system utilities"
opkg install mount-utils ntfs-3g kmod-fs-vfat fdisk resize2fs e2fsprogs kmod-fs-ext4

# Upgrade all packages
echo && echo "===== Upgrade all packages"
opkg list-upgradable | cut -f 1 -d ' ' | xargs opkg upgrade
opkg update

# Clean downloaded files
echo "- Cleaning downloaded files"
cd .. && rm -rf ${tempdir}

# End
echo && echo "===== All done, please reboot your device." && echo

# Backup Useful utilities

# e2fsck -y /dev/mmcblk0p2 # Unlock read-only file system

# Configure nftables for openwrt 22.03 or above
# nft add table nat
# nft -- add chain nat prerouting { type nat hook prerouting priority -100 \; }
# nft add chain nat postrouting { type nat hook postrouting priority 100 \; }
# nft add rule nat postrouting masquerade