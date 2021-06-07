REM Building docker image
if "%1"=="--build" docker build -t opendronemap/webodm_slate .

REM Launching server
docker run -ti --rm -v "%CD%":/webodm/slate -p 4567:4567 --entrypoint bash opendronemap/webodm_slate -c "bundle install && bundle exec middleman server --watcher-force-polling"
