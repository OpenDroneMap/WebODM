FROM ruby:2.7.3
EXPOSE 4567

RUN apt-get update && apt-get install -y git nodejs
RUN git clone https://github.com/OpenDroneMap/WebODM /webodm --depth 1 

WORKDIR /webodm/slate
RUN bundle install

ENTRYPOINT ["bundle", "exec", "middleman", "server"]
