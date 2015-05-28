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

function parseType(obj, name) {
  var member = { name: name };
  switch (typeof obj) {
    case "boolean":
      member.type = 'boolean';
      member.javaType = member.type;
      break;
    case "string":
      member.type = 'string';
      member.javaType = 'String';
      member.example = obj;
      break;
    case "number":
      member.type = (obj % 1 === 0) ? 'int' : 'float';
      member.javaType = member.type;
      break;
    case 'object':
      if (obj instanceof Array) {
        member.type = 'array';
        var containedType = parseType(obj[0], singularize(name));
        member.arrayType = containedType.type;
        member.javaType = arrayType + '<' + containedType.javaType + ">";
      } else {
        parseObject(obj, name);
        member.type = name;
        member.javaType = nameToJavaClass(name);
      }
      break;
    default: // when there is no type, e.g. an empty array
      member.type = 'String';
      member.javaType = 'String';
  }
  return (member);
}

function parseObject(obj, name) {
  var members=[];
  for (var key in obj) {
    members.push(parseType(obj[key], key));
  }
  if (types.hasOwnProperty[name]) console.log('duplicate type ' + name);
  types[name] = {name: name, members: members};
}

function javaType(entry) {
  switch (entry.type) {
    case 'int':
      return(entry.type);
    case 'float':
      return(entry.type);
    case 'array':
      return('java.util.List<' + nameToJavaClass(entry.arrayType) + '>');
    case 'string':
      return('String');
    default:
      return(nameToJavaClass(entry.type));
  }
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
 //      console.log(code);
  }
}

function compareTypes(t1, t2) {
  if (typeof t1 == 'undefined' || typeof t2 == 'undefined') return false;
  if (t1.members.length != t2.members.length) return(false);
  for (var i=0; i<t1.members.length; i++) {
    var m1 = t1.members[i], m2 = t2.members[i];
    if (m1.name != m2.name || m1.type != m2.type) return(false);
  }
  return(true);
}

// replace one type in the model with another

function replaceType(t1, t2) {
  console.log('Replacing ' + t1.name + ' with ' + t2.name);
  for (var x in types) {
    var t = types[x];
    for(var i=0; i< t.members.length; i++) {
      if (t.members[i].type == t1.name) {
        t.members[i].type = t2.name;
      }
    }
  }
  delete(types[t1.name]);
}

function findDuplicateTypes() {
  for (var x in types) {
    for (var y in types) {
      if (x != y) {
        if (compareTypes(types[x], types[y])) {
          if (types[x].name.length < types[y].name.length) {
            replaceType(types[y], types[x]);
          } else {
            replaceType(types[x], types[y]);
          }
        }
      }
    }
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
      if (t.members[i].example) {
        code += '          "example":"' + t.members[i].example.trim() + '",\n';
      }
      code += '          "type": "' + apiDocType(t.members[i]) + '"\n';
      code += '        }' + (i< t.members.length-1 ? ',' : '') + '\n';
    }
    code += '      ]\n    }' + ((j < typeNames.length-1)?',':'') + '\n'
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
  parseType(asJson, rootTypeName);
  findDuplicateTypes();
  generateJava2();

  $('#apidoc').html(generateApiDocJson(rootTypeName));
  for (var k in types) {
    console.log(types[k]);
  }
  var content = zip.generate({
    type: "blob"
  });
  // saveAs(content, "example.zip");
});

$('#saveapidoc').click(function() {
  saveAs( new Blob([$('#apidoc').html()], { type: "application.json"}), "apidoc.json")
});

$('#fetch-json').click(function() {
  var url=$('#json-url').val();
  $.getJSON(url).done(function(data) {
    $('#input-json').html(JSON.stringify(data.response));
  }).fail(function(status, err) {
    alert('Error ' + err + ' loading JSON from ' + url);
  })
});