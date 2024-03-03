

const pluginDescriptor = JSON.parse(Plugin.manifest);
// plugin constants
const PLUGIN_PREFIX = pluginDescriptor.id;
const PLUGIN_TITLE = pluginDescriptor.title;
const PLUGIN_SYNOPSIS = pluginDescriptor.synopsis;
const PLUGIN_AUTHOR = pluginDescriptor.author;
const PLUGIN_VERSION = pluginDescriptor.version;
const PLUGIN_LOGO = Plugin.path + pluginDescriptor.icon;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36';

const service = require('movian/service');
service.create(PLUGIN_TITLE, PLUGIN_PREFIX + ':start', 'video', true, PLUGIN_LOGO);