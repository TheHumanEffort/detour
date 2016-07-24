Rails.application.routes.draw do
  devise_for :users, path: 'authentication'
  get '*route', to: 'application#route'
  root to: 'application#route'
end
