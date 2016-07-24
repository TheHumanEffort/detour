class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
  before_action :authenticate_user!, only: :route
  
  def route
    Rails.logger.info "User ID: #{ current_user.id }"

    response.headers['X-Detour-Continue'] = 'true'
    response.headers['X-Detour-Add-Headers'] = "X-Detour-User-Id=#{ current_user.id }"
    render :text => 'OK'
  end
end


