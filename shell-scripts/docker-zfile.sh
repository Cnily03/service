#!/bin/bash

# Configuration
PORT=5222
NAME=test
RESTART_POLICY=unless-stopped
DB_DIR_MNT_PATH=/opt/zfile/db
LOG_DIR_MNT_PATH=/opt/zfile/logs
FILE_DIR_MNT_PATH=/opt/zfile/file
CONF_FILE_MNT_PATH=/opt/zfile/application.properties

# Environment Configuration
NAME_PREFIX=zfile
INTERNAL_PORT=8080
AUTO_UPDATE_DEFAULT_INTERVAL=3600
DOCKER_SOCK_FILE=/var/run/docker.sock

function download_conf() {
    local dir_name
    dir_name=$(dirname "$CONF_FILE_MNT_PATH")
    if [ ! -d "$dir_name" ]; then
        mkdir -p "$dir_name"
    fi
    curl -k -o "$CONF_FILE_MNT_PATH" https://c.jun6.net/ZFILE/application.properties
}

function create() {
    # Detect if docker name already exists
    if [ ! -z "$(docker ps -a | grep "$NAME_PREFIX-$NAME")" ]; then
        echo "Error: Docker already exists: $NAME"
        exit 1
    fi
    # Detect if config mount path exists
    if [ ! -z "$CONF_FILE_MNT_PATH" ]; then
        if [ -d "$CONF_FILE_MNT_PATH" ]; then # is directory
            echo "Error: $CONF_FILE_MNT_PATH is a directory"
            exit 1
        fi
        # if not exists
        if [ ! -f "$CONF_FILE_MNT_PATH" ]; then
            download_conf
        fi
    fi

    # Generate docker run command volume option
    local mnt_option
    volume_option=""
    if [ ! -z "$DB_DIR_MNT_PATH" ] && [ ! -f "$DB_DIR_MNT_PATH" ]; then
        volume_option="$volume_option -v $DB_DIR_MNT_PATH:/root/.zfile-v4/db"
    fi
    if [ ! -z "$LOG_DIR_MNT_PATH" ] && [ ! -f "$LOG_DIR_MNT_PATH" ]; then
        volume_option="$volume_option -v $LOG_DIR_MNT_PATH:/root/.zfile-v4/logs"
    fi
    if [ ! -z "$FILE_DIR_MNT_PATH" ] && [ ! -f "$FILE_DIR_MNT_PATH" ]; then
        volume_option="$volume_option -v $FILE_DIR_MNT_PATH:/data/file"
    fi
    if [ ! -z "$CONF_FILE_MNT_PATH" ] && [ ! -d "$CONF_FILE_MNT_PATH" ]; then
        volume_option="$volume_option -v $CONF_FILE_MNT_PATH:/root/application.properties"
    fi

    # LOG_DIR_MNT_PATH is set
    # Pull latest image
    docker run -d --name="$NAME_PREFIX-$NAME" --restart="$RESTART_POLICY" \
        -p $PORT:$INTERNAL_PORT \
        $volume_option \
        zhaojun1998/zfile
}

function update() {
    docker run --rm \
        --name "update_$NAME" \
        -v $DOCKER_SOCK_FILE:/var/run/docker.sock \
        containrrr/watchtower \
        --cleanup \
        --run-once \
        "$NAME_PREFIX-$NAME"
}

function auto_update() {
    local INTERVAL
    if [ -n "$1" ]; then
        INTERVAL="$1"
    else
        INTERVAL="$AUTO_UPDATE_DEFAULT_INTERVAL"
    fi
    docker run -d \
        --name "auto_update_$NAME_PREFIX-$NAME" \
        --restart="unless-stopped" \
        -v $DOCKER_SOCK_FILE:/var/run/docker.sock \
        containrrr/watchtower \
        --cleanup \
        "$NAME_PREFIX-$NAME" \
        -i $INTERVAL
}

function close_auto_update() {
    if [ ! -z "$(docker ps -a | grep auto_update_$NAME)" ]; then
        {
        docker stop "auto_update_$NAME_PREFIX-$NAME"
        docker rm -f "auto_update_$NAME_PREFIX-$NAME"
        } && \
        echo "Closed auto update task"
    else
        echo "No auto update task"
    fi
}

function start() {
    docker start "$NAME_PREFIX-$NAME" && \
    echo "Started $NAME"
}

function stop() {
    docker stop "$NAME_PREFIX-$NAME" && \
    echo "Stopped $NAME"
}

function restart() {
    docker restart "$NAME_PREFIX-$NAME" && \
    echo "Restarted $NAME"
}

function remove() {
    close_auto_update >> /dev/null 2>&1
    {
    docker stop "$NAME_PREFIX-$NAME"
    docker rm -f "$NAME_PREFIX-$NAME"
    } && \
    echo "Removed $NAME"
}

function list() {
    docker ps -a | grep "$NAME_PREFIX-"
}

function status() {
    docker ps -a | grep "$NAME_PREFIX-$NAME"
}

function backup() {
    docker exec -it "$NAME_PREFIX-$NAME" /bin/bash -c "cd /root/.zfile-v4/db && tar -zcvf /root/.zfile-v4/db.tar.gz ."
    docker cp "$NAME_PREFIX-$NAME":/root/.zfile-v4/db.tar.gz .
}

function backup() {
    local DEST_DIR
    if [ -n "$1" ]; then
        DEST_DIR="$1"
    else
        DEST_DIR="."
    fi

    local NAME_FORMATTED backup_fn
    NAME_FORMATTED=$(echo -n "$NAME" | sed 's/[^0-9a-zA-Z_-]/-/g')
    backup_fn="backup_${NAME_FORMATTED}_$(date +"%Y%m%d%H%M%S").tar.gz"

    docker exec -it "$NAME_PREFIX-$NAME" /bin/bash -c " \
            cd /root && \
            tar -zcvf /root/$backup_fn \
                --transform 's,^root/,,' \
                --transform 's,^data/,,' \
                /root/.zfile-v4/db \
                /root/.zfile-v4/logs \
                /data/file \
                /root/application.properties \
    "
    docker cp "$NAME_PREFIX-$NAME":/root/$backup_fn "$DEST_DIR" && \
    docker exec -it "$NAME_PREFIX-$NAME" /bin/bash -c "rm -f /root/$backup_fn" && \
    echo "Backuped $NAME important files to $DEST_DIR (filename: $backup_fn)"
}

function load() {
    local FILE
    if [ -n "$1" ]; then
        FILE="$1"
    else
        echo "Error: No file specified"
        exit 1
    fi
    if [ -d "$FILE" ]; then
        echo "Error: $FILE is a directory"
        exit 1
    fi
    if [ ! -f "$FILE" ]; then
        echo "Error: File not exists: $FILE"
        exit 1
    fi

    # Confirm
    local confirm
    echo -n "Warning: This will OVERWRITE current data and RESTART the current service, continue? [y/N]"
    read -r confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Canceled"
        exit 0
    fi

    # Backup
    echo "Transpoting backup file..." && \
    docker cp "$FILE" "$NAME_PREFIX-$NAME":/root/backup.tar.gz && \
    echo "Shutting down current service..." && \
    docker exec -it "$NAME_PREFIX-$NAME" /bin/bash -c " \
            ps -ef | grep java | grep -v grep | grep -v /bin/sh | awk '{print \$2}' | xargs kill -9
    " && \
    echo "Loading..." && \
    docker exec -it "$NAME_PREFIX-$NAME" /bin/bash -c " \
            function transport_files() {
                local src_dir=\"\$1\"
                local dest_dir=\"\$2\"
                [ -d \$src_dir ] && find \"\$src_dir\" -mindepth 1 -maxdepth 1 -exec mv -f -t \"\$dest_dir\" \"{}\" \;
            }
            cd /root && \
            rm -rf /root/backup-tmp && \
            mkdir -p /root/backup-tmp && \
            tar -zxvf backup.tar.gz -C /root/backup-tmp && \
            rm -rf backup.tar.gz && \
            rm -rf /root/.zfile-v4/db/{,.[!.],..?}* /root/.zfile-v4/logs/{,.[!.],..?}* /data/file/{,.[!.],..?}* && \
            mkdir -p /root/.zfile-v4/db /root/.zfile-v4/logs /data/file && \
            transport_files /root/backup-tmp/.zfile-v4/db   /root/.zfile-v4/db
            transport_files /root/backup-tmp/.zfile-v4/logs /root/.zfile-v4/logs
            transport_files /root/backup-tmp/file           /data/file
            [ -f /root/backup-tmp/application.properties ] && echo /root/backup-tmp/application.properties > /root/application.properties
            rm -rf /root/backup-tmp \
    " && \
    echo "Loaded $FILE to $NAME" && \
    echo "Restarting..." && \
    docker restart "$NAME_PREFIX-$NAME" && \
    echo "Restarted $NAME" && \
    echo "Done"
}

# Main

function usage() {
    echo "Usage: $@ [options] <subcommand>"
    echo "Options:"
    echo "  -n, --name <name>           Set docker name (prefix with \"$NAME_PREFIX-\")"
    echo "  -p, --port <port>           Set docker port"
    echo "Subcommands:"
    echo "  create                      Create a new docker"
    echo "  update                      Update docker image"
    echo "  update --auto [interval]    Enable auto update"
    echo "  update --disable-auto       Disable auto update"
    echo "  start                       Start docker"
    echo "  stop                        Stop docker"
    echo "  restart                     Restart docker"
    echo "  remove                      Remove docker"
    echo "  list                        List all dockers"
    echo "  backup [dest_dir]           Backup important files"
    echo "  load <file>                 Load backup file"
    echo "  help                        Show this help message"
}

function subcommand() {

    if [ "$1" = "create" ]; then
        shift
        create
    elif [ "$1" = "update" ]; then
        shift
        if [ -z "$1" ]; then
            update
        else
            case "$1" in
                --auto)
                    shift
                    if [ -z "$1" ] || [[ "$1" =~ ^- ]]; then
                        auto_update
                    # $1 is number
                    elif [[ "$1" =~ ^[0-9]+$ ]]; then
                        auto_update $1
                        shift
                    else
                        echo "Error: Invalid interval"
                        exit 1
                    fi
                    ;;
                --disable-auto)
                    shift
                    close_auto_update
                    ;;
                -*)
                    echo "Error: Invalid option: $1"
                    exit 1
                    ;;
                *)
                    echo "Error: Invalid argument: $1"
                    exit 1
                    ;;
            esac
        fi
    elif [ "$1" = "start" ]; then
        shift
        start $@
    elif [ "$1" = "stop" ]; then
        shift
        stop $@
    elif [ "$1" = "restart" ]; then
        shift
        restart $@
    elif [ "$1" = "remove" ]; then
        shift
        remove $@
    elif [ "$1" = "list" ]; then
        shift
        list $@
    elif [ "$1" = "status" ]; then
        shift
        status $@
    elif [ "$1" = "backup" ]; then
        shift
        backup $@
    elif [ "$1" = "load" ]; then
        shift
        if [ -z "$1" ]; then
            echo "Error: No file specified"
            exit 1
        fi
        load $@
    elif [ "$1" = "help" ]; then
        usage
        exit 0
    elif [ -z "$1" ]; then
        usage
        exit 0
    else
        echo "Error: Invalid subcommand: $1"
        exit 1
    fi
}

function main() {
    while [ $# -gt 0 ]; do
        case "$1" in
            -n|--name)
                shift
                # $1 is option or empty
                if [ -z "$1" ] || [[ "$1" =~ ^- ]]; then
                    echo "Error: Missing name"
                    exit 1
                fi
                NAME="$1"
                shift
                ;;
            -p|--port)
                shift
                # $1 is option or empty
                if [ -z "$1" ] || [[ "$1" =~ ^- ]]; then
                    echo "Error: Missing port"
                    exit 1
                fi
                PORT="$1"
                shift
                ;;
            -*)
                echo "Error: Invalid option: $1"
                exit 1
                ;;
            *)
                subcommand $@
                exit 0
                ;;
        esac
    done

    if [ -z "$1" ]; then
        usage
        exit 0
    fi
}

main $@
