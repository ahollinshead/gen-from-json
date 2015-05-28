"use strict";

var packageName,
  zip,
  arrayType,
  types={};

function nameToJavaClass(name) {
  return name.substr(0, 1).toUpperCase() + name.substring(1);
}

function singularize(name) {
  if (name.endsWith('ies'))
    return name.substr(0, name.length - 3) + 'y';
  else if (name.endsWith('s'))
    return name.substr(0, name.length - 1);
  else
    return name;
}

function parseType(obj, name, generatorFn) {
  var member = { name: name };
  switch (typeof obj) {
    case "boolean":
      member.type = 'boolean';
      member.javaType = member.type;
      break;
    case "string":
      member.type = 'string';
      member.javaType = 'String';
      break;
    case "number":
      member.type = (obj % 1 === 0) ? 'int' : 'float';
      member.javaType = member.type;
      break;
    case 'object':
      if (obj instanceof Array) {
        member.type = 'array';
        var containedType = parseType(obj[0], singularize(name), generatorFn);
        member.arrayType = containedType.type;
        member.javaType = arrayType + '<' + containedType.javaType + ">";
      } else {
        generatorFn(obj, name, generatorFn);
        member.type = name;
        member.javaType = nameToJavaClass(name);
      }
      break;
    default:
      member.type = 'String';
      member.javaType = 'String';
  }
  return (member);
}

function parseObject(obj, name) {
  var members=[];
  for (var key in obj) {
    members.push(parseType(obj[key], key, parseObject));
  }
  if (types.hasOwnProperty[name]) console.log('duplicate type ' + name);
  types[name] = {name: name, members: members};
}

function generateJava(obj, varName) {
  var className = nameToJavaClass(varName),
    code = "package " + packageName + ";\n\nclass " + className + " {\n",
    name,
    toString = '  public String toString() {\n    return "' + className + '("',
    isFirst = true,
    constructorBody = '',
    constructorHeader = '  public ' + className + '(';
  for (name in obj) {
    var typeName = parseType(obj[name], name, generateJava).javaType;
    constructorHeader += (isFirst ? '' : ', ') + typeName + " " + name;
    constructorBody += '    this.' + name + ' = ' + name + ';\n';
    code = code + "  public " + typeName + " " + name + ";\n";
    toString = toString + ' + ' + (isFirst ? '"' : '", ') + name + ':" + ' + ((obj[name] instanceof Array) ? 'java.util.Arrays.toString(' + name + '.toArray())' : name)
    isFirst = false;
  }
  code = code + '\n' + constructorHeader + ') {\n' + constructorBody + '  }\n\n' + toString + '+ ")";\n  }\n\n}';
  zip.file(packageName.replace(/\./g, '/') + '/' + className + ".java", code);
 // console.log(code);
}

function generateJava2() {
  for (var key in types) {
    var t = types[key];
    var className = nameToJavaClass(t.name),
      code = "package " + packageName + ";\n\nclass " + className + " {\n",
      toString = '  public String toString() {\n    return "' + className + '("',
      constructorBody = '',
      constructorHeader = '  public ' + className + '(';
    for (var i = 0; i < t.members.length; i++) {
      var typeName = t.members[i].javaType,
        name = t.members[i].name;
      constructorHeader += (i == 0 ? '' : ', ') + typeName + " " + name;
      constructorBody += '    this.' + name + ' = ' + name + ';\n';
      code = code + "  public " + typeName + " " + name + ";\n";
      toString = toString + ' + ' + (i == 0 ? '"' : '", ') + name + ':" + ' + ((t.members[i].type == 'array') ? 'java.util.Arrays.toString(' + name + '.toArray())' : name);
    }
    code = code + '\n' + constructorHeader + ') {\n' + constructorBody + '  }\n\n' + toString + '+ ")";\n  }\n\n}';
//    zip.file(packageName.replace(/\./g, '/') + '/' + className + ".java", code);
    console.log(code);
  }
}

function apiDocType(entry) {
  switch (entry.type) {
    case 'array':
      return('[' + entry.arrayType + ']');
    case 'int':
      return('long');
    case 'float':
      return('double');
    default:
      return(entry.type);
  }
}

function generateApiDocJson(apiName) {
  var code = '{\n  "name": "' + apiName + '",\n';
  code += '  "models": {\n';
  var typeNames = Object.getOwnPropertyNames(types);
  for (var j = 0; j < typeNames.length; j++ ) {
    var t = types[typeNames[j]];
    code += '    "' + t.name + '": {\n      "fields": [\n';
    for (var i = 0; i < t.members.length; i++) {
      code += '        {\n';
      code += '          "name": "' + t.members[i].name + '",\n';
      code += '          "type": "' + apiDocType(t.members[i]) + '"\n';
      code += '        }' + (i< t.members.length-1 ? ',' : '') + '\n';
    }
    code += '      ]\n    },\n'
  }
  code += '  }\n}';
  return(code);
}

$('#generate-java').click(function() {
  types = {};
  packageName = $('#java-package').val();
  arrayType = $('#array-mapping-type').val();
  zip = new JSZip();
  var asJson = JSON.parse($('#input-json').val());
  var rootTypeName = $('#root-class').val();
  parseObject(asJson, rootTypeName);
  generateJava2();

  $('#apidoc').html(generateApiDocJson(rootTypeName));
  for (var i=0; i<types.length; i++ ) {
    console.log(types[i]);
  }
  var content = zip.generate({
    type: "blob"
  });
   // saveAs(content, "example.zip");
});