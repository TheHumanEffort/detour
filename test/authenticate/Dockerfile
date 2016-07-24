FROM ruby:2.3.1

RUN apt-get update -qq && \
    apt-get install -y libpq-dev libpq5 nodejs wkhtmltopdf && \
    apt-get clean && \
    apt-get autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENV APP_HOME /application
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

CMD bash -c 'rm -f /application/tmp/pids/server.pid && bin/rails server --port 3005 --binding 0.0.0.0'
EXPOSE 3005

ADD Gemfile* $APP_HOME/
RUN bundle install

ADD . $APP_HOME
ADD config/database.docker.yml $APP_HOME/config/database.yml

