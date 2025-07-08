require File.expand_path(File.dirname(__FILE__) + '/helper')

describe "String#colorize" do
  it "should colorize text correctly" do
    assert_equal "\e[0;34mHello world\e[0m", "Hello world".colorize(:blue)
    assert_equal "\e[0;30mHello world\e[0m", "Hello world".colorize(:black)
    assert_equal "\e[0;31mHello world\e[0m", "Hello world".colorize(:red)
    assert_equal "\e[0;32mHello world\e[0m", "Hello world".colorize(:green)
    assert_equal "\e[0;33mHello world\e[0m", "Hello world".colorize(:yellow)
    assert_equal "\e[0;34mHello world\e[0m", "Hello world".colorize(:blue)
    assert_equal "\e[0;35mHello world\e[0m", "Hello world".colorize(:magenta)
    assert_equal "\e[0;36mHello world\e[0m", "Hello world".colorize(:cyan)
    assert_equal "\e[0;37mHello world\e[0m", "Hello world".colorize(:white)
  end

  it "should colorize text when using color name method" do
    assert_equal "\e[0;30mHello world\e[0m", String::Colorizer.black("Hello world")
    assert_equal "\e[0;31mHello world\e[0m", String::Colorizer.red("Hello world")
    assert_equal "\e[0;32mHello world\e[0m", String::Colorizer.green("Hello world")
    assert_equal "\e[0;33mHello world\e[0m", String::Colorizer.yellow("Hello world")
    assert_equal "\e[0;34mHello world\e[0m", String::Colorizer.blue("Hello world")
    assert_equal "\e[0;35mHello world\e[0m", String::Colorizer.magenta("Hello world")
    assert_equal "\e[0;36mHello world\e[0m", String::Colorizer.cyan("Hello world")
    assert_equal "\e[0;37mHello world\e[0m", String::Colorizer.white("Hello world")
  end

  it "should be possible to set the mode" do
    assert_equal "\e[1;34mHello world\e[0m", "Hello world".colorize(:color => :blue, :mode => :bold)
    assert_equal "\e[1;34mHello world\e[0m", String::Colorizer.blue("Hello world", :bold)
  end
end
