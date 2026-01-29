#!/bin/bash

# Script helper pour gérer OMNIA sur Kubernetes
# Usage: ./omnia.sh [commande] [environnement]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         OMNIA Kubernetes Management Script           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Usage: ./omnia.sh [commande] [environnement]"
    echo ""
    echo "Environnements:"
    echo "  dev     - Environnement de développement (omnia-dev)"
    echo "  prod    - Environnement de production (omnia)"
    echo ""
    echo "Commandes:"
    echo "  status      - Afficher le statut des services"
    echo "  logs        - Afficher les logs (api ou front)"
    echo "  restart     - Redémarrer un service"
    echo "  scale       - Scaler un service"
    echo "  deploy      - Déployer les manifests"
    echo "  rollback    - Rollback à la version précédente"
    echo "  secret      - Mettre à jour les secrets"
    echo "  ingress     - Voir les ingress"
    echo "  events      - Voir les événements récents"
    echo "  shell       - Ouvrir un shell dans un pod"
    echo ""
    echo "Exemples:"
    echo "  ./omnia.sh status dev"
    echo "  ./omnia.sh logs dev api"
    echo "  ./omnia.sh restart prod front"
    echo "  ./omnia.sh scale dev api 3"
    echo ""
}

# Fonction pour obtenir le namespace
get_namespace() {
    case $1 in
        dev)
            echo "omnia-dev"
            ;;
        prod)
            echo "omnia"
            ;;
        *)
            echo -e "${RED}❌ Environnement invalide. Utilisez 'dev' ou 'prod'${NC}"
            exit 1
            ;;
    esac
}

# Fonction status
cmd_status() {
    local env=$1
    local ns=$(get_namespace $env)
    
    echo -e "${BLUE}📊 Statut de l'environnement ${YELLOW}${env}${BLUE} (namespace: ${ns})${NC}"
    echo ""
    
    echo -e "${GREEN}═══ Deployments ═══${NC}"
    kubectl get deployments -n $ns
    echo ""
    
    echo -e "${GREEN}═══ Pods ═══${NC}"
    kubectl get pods -n $ns -o wide
    echo ""
    
    echo -e "${GREEN}═══ Services ═══${NC}"
    kubectl get services -n $ns
    echo ""
    
    echo -e "${GREEN}═══ Ingress ═══${NC}"
    kubectl get ingress -n $ns
}

# Fonction logs
cmd_logs() {
    local env=$1
    local service=$2
    local ns=$(get_namespace $env)
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Spécifiez un service: api ou front${NC}"
        exit 1
    fi
    
    case $service in
        api)
            deployment="omnia-api"
            ;;
        front)
            deployment="omnia-front"
            ;;
        db)
            deployment="omnia-db"
            ;;
        *)
            echo -e "${RED}❌ Service invalide. Utilisez: api, front, ou db${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}📋 Logs de ${YELLOW}${service}${BLUE} en ${YELLOW}${env}${NC}"
    kubectl logs -f deployment/${deployment} -n $ns --tail=100
}

# Fonction restart
cmd_restart() {
    local env=$1
    local service=$2
    local ns=$(get_namespace $env)
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Spécifiez un service: api ou front${NC}"
        exit 1
    fi
    
    case $service in
        api)
            deployment="omnia-api"
            ;;
        front)
            deployment="omnia-front"
            ;;
        *)
            echo -e "${RED}❌ Service invalide. Utilisez: api ou front${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${YELLOW}🔄 Redémarrage de ${service} en ${env}...${NC}"
    kubectl rollout restart deployment/${deployment} -n $ns
    echo -e "${GREEN}✅ Redémarrage lancé${NC}"
    
    echo -e "${BLUE}Attente du rollout...${NC}"
    kubectl rollout status deployment/${deployment} -n $ns --timeout=5m
}

# Fonction scale
cmd_scale() {
    local env=$1
    local service=$2
    local replicas=$3
    local ns=$(get_namespace $env)
    
    if [ -z "$service" ] || [ -z "$replicas" ]; then
        echo -e "${RED}❌ Usage: ./omnia.sh scale [env] [service] [replicas]${NC}"
        exit 1
    fi
    
    case $service in
        api)
            deployment="omnia-api"
            ;;
        front)
            deployment="omnia-front"
            ;;
        *)
            echo -e "${RED}❌ Service invalide. Utilisez: api ou front${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${YELLOW}📏 Scaling ${service} to ${replicas} replicas en ${env}...${NC}"
    kubectl scale deployment/${deployment} --replicas=${replicas} -n $ns
    echo -e "${GREEN}✅ Scaling effectué${NC}"
}

# Fonction deploy
cmd_deploy() {
    local env=$1
    local ns=$(get_namespace $env)
    
    echo -e "${YELLOW}🚀 Déploiement en ${env}...${NC}"
    kubectl apply -k k8s/overlays/${env}
    echo -e "${GREEN}✅ Manifests appliqués${NC}"
    
    echo -e "${BLUE}Attente du rollout de l'API...${NC}"
    kubectl rollout status deployment/omnia-api -n $ns --timeout=5m
    
    echo -e "${BLUE}Attente du rollout du Frontend...${NC}"
    kubectl rollout status deployment/omnia-front -n $ns --timeout=5m
    
    echo -e "${GREEN}✅ Déploiement terminé${NC}"
}

# Fonction rollback
cmd_rollback() {
    local env=$1
    local service=$2
    local ns=$(get_namespace $env)
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Spécifiez un service: api ou front${NC}"
        exit 1
    fi
    
    case $service in
        api)
            deployment="omnia-api"
            ;;
        front)
            deployment="omnia-front"
            ;;
        *)
            echo -e "${RED}❌ Service invalide. Utilisez: api ou front${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${YELLOW}⏮️  Rollback de ${service} en ${env}...${NC}"
    kubectl rollout undo deployment/${deployment} -n $ns
    echo -e "${GREEN}✅ Rollback effectué${NC}"
    
    echo -e "${BLUE}Attente du rollout...${NC}"
    kubectl rollout status deployment/${deployment} -n $ns --timeout=5m
}

# Fonction ingress
cmd_ingress() {
    local env=$1
    local ns=$(get_namespace $env)
    
    echo -e "${BLUE}🌐 Ingress en ${env}${NC}"
    kubectl get ingress -n $ns
    echo ""
    kubectl describe ingress omnia -n $ns
}

# Fonction events
cmd_events() {
    local env=$1
    local ns=$(get_namespace $env)
    
    echo -e "${BLUE}📅 Événements récents en ${env}${NC}"
    kubectl get events -n $ns --sort-by='.lastTimestamp' | tail -30
}

# Fonction shell
cmd_shell() {
    local env=$1
    local service=$2
    local ns=$(get_namespace $env)
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Spécifiez un service: api, front, ou db${NC}"
        exit 1
    fi
    
    case $service in
        api)
            label="app=omnia-api"
            ;;
        front)
            label="app=omnia-front"
            ;;
        db)
            label="app=omnia-db"
            ;;
        *)
            echo -e "${RED}❌ Service invalide. Utilisez: api, front, ou db${NC}"
            exit 1
            ;;
    esac
    
    local pod=$(kubectl get pods -n $ns -l $label -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$pod" ]; then
        echo -e "${RED}❌ Aucun pod trouvé pour ${service}${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🐚 Ouverture d'un shell dans ${YELLOW}${pod}${NC}"
    kubectl exec -it $pod -n $ns -- /bin/bash || kubectl exec -it $pod -n $ns -- /bin/sh
}

# Fonction secret
cmd_secret() {
    local env=$1
    local ns=$(get_namespace $env)
    
    echo -e "${YELLOW}🔐 Mise à jour des secrets en ${env}${NC}"
    echo ""
    read -sp "Mot de passe DB: " db_password
    echo ""
    read -p "Connection String: " connection_string
    echo ""
    
    kubectl create secret generic omnia-secrets \
        --from-literal=db-password="${db_password}" \
        --from-literal=connection-string="${connection_string}" \
        --namespace=$ns \
        --dry-run=client -o yaml | kubectl apply -f -
    
    echo -e "${GREEN}✅ Secrets mis à jour${NC}"
    echo -e "${YELLOW}⚠️  Pensez à redémarrer les pods pour prendre en compte les nouveaux secrets${NC}"
}

# Main
main() {
    local command=$1
    local env=$2
    
    if [ -z "$command" ]; then
        show_help
        exit 0
    fi
    
    if [ "$command" == "help" ] || [ "$command" == "-h" ] || [ "$command" == "--help" ]; then
        show_help
        exit 0
    fi
    
    if [ -z "$env" ]; then
        echo -e "${RED}❌ Spécifiez un environnement: dev ou prod${NC}"
        exit 1
    fi
    
    case $command in
        status)
            cmd_status $env
            ;;
        logs)
            cmd_logs $env $3
            ;;
        restart)
            cmd_restart $env $3
            ;;
        scale)
            cmd_scale $env $3 $4
            ;;
        deploy)
            cmd_deploy $env
            ;;
        rollback)
            cmd_rollback $env $3
            ;;
        ingress)
            cmd_ingress $env
            ;;
        events)
            cmd_events $env
            ;;
        shell)
            cmd_shell $env $3
            ;;
        secret)
            cmd_secret $env
            ;;
        *)
            echo -e "${RED}❌ Commande inconnue: ${command}${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"