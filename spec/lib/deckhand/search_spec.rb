require 'spec_helper'

describe 'search' do

  before do
    Deckhand.configure do
      model_storage :dummy

      model Foo do
        search_on :foo, :bar, :baz
        search_on :bonk, :match => :exact
      end

      model Bar do
        search_on :quuz, :quux, :match => :exact
      end
    end
    Deckhand.config.run
  end

  # this test depends upon Deckhand::ModelStorage::Dummy#search
  it 'searches across all models with specified search fields' do
    Deckhand.config.model_storage.search('text!').should == [
      OpenStruct.new(model: Foo, text: 'text!', match_field: :foo, match_type: nil),
      OpenStruct.new(model: Foo, text: 'text!', match_field: :bar, match_type: nil),
      OpenStruct.new(model: Foo, text: 'text!', match_field: :baz, match_type: nil),
      OpenStruct.new(model: Foo, text: 'text!', match_field: :bonk, match_type: :exact),
      OpenStruct.new(model: Bar, text: 'text!', match_field: :quuz, match_type: :exact),
      OpenStruct.new(model: Bar, text: 'text!', match_field: :quux, match_type: :exact)
    ]
  end

end