NAME := transcendence
PG_VOLUME := /home/${USER}/data/postgres
DOCKER_COMPOSE_FILE := ./srcs/docker-compose.yaml
DOCKER_COMPOSE := docker compose -f $(DOCKER_COMPOSE_FILE)

all: $(NAME)

$(NAME): create-volumes
	$(DOCKER_COMPOSE) up --build

create-volumes:
	mkdir -p $(PG_VOLUME)

up: create-volumes
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down

stop:
	$(DOCKER_COMPOSE) stop

start:
	$(DOCKER_COMPOSE) start

restart: down up

logs:
	$(DOCKER_COMPOSE) logs

ps:
	$(DOCKER_COMPOSE) ps

clean:
	$(DOCKER_COMPOSE) down
	@docker image prune -f
	@docker container prune -f
	@docker network prune -f
	@docker system prune -af

fclean: clean
	@docker volume prune -af
	@rm -rf $(PG_VOLUME)

re: fclean $(NAME)

.PHONY: all up down stop start restart logs ps clean fclean re