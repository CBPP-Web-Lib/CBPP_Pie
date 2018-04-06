/*globals CBPP*/
module.exports = function($) {
return function(p, selector) {
  "use strict";
  var c2e = p.c2e;
  var e2c = p.e2c;
  function horizontalIntersectWithSector(y, theta0, theta1, Rx, Ry, x0, y0) {
      var lineIntersect = function(theta) {
          theta = theta%360;
          if (theta < 0) {
              theta += 360;
          }
          if (theta === 0) {
              return undefined;
          }
          if (theta === 90 || theta === 270) {
              return x0;
          }
          theta = theta/180 * Math.PI;
          var etheta = c2e(theta, Rx, Ry);
          return (x0 - (y - y0)/(Math.tan(etheta)));
      };
      var points = [];
      var circle = lineIntersectWithCircle(y, y0, Rx, Ry);
      var rightAngleEllipse = Math.atan((y0-y)/(circle));
      var rightAngle = e2c(rightAngleEllipse, Rx, Ry)*180/Math.PI,
      leftAngle = 180 - rightAngle;

      if (y > y0) {
          rightAngle = 360 + rightAngle;
          leftAngle = 180 - rightAngle;
      }
      function angleInRange(angle, lower, upper) {
          angle = angle%360;
          while (angle <= 720) {
              if (angle >= lower && angle <= upper) {
                  return true;
              }
              angle+=360;
          }
          return false;
      }
      var l0 = lineIntersect(theta0),
          l1 = lineIntersect(theta1);
      if (y > y0) {
          var temp = l0;
          l0 = l1;
          l1 = temp;
      }
      if (angleInRange(rightAngle, theta0, theta1)) {
          points.push(x0 + circle);
      } else {
          if (typeof(l0)!=="undefined") {
              if (l0 >= (x0 - circle) && l0 <= (x0 + circle)) {
                  points.push(l0);
              }
          }
      }
      if (angleInRange(leftAngle, theta0, theta1)) {
          points.push(x0 - circle);
      } else {
          if (typeof(l1)!=="undefined") {
              if (l1 >= (x0 - circle) && l1 <= (x0 + circle)) {
                  points.push(l1);
              }
          }
      }
      return points;
  }
  function lineIntersectWithCircle(y, y0, Rx, Ry) {
      var result = Math.sqrt((Math.pow(Rx,2)*(1 - Math.pow(y-y0, 2)/Math.pow(Ry, 2))));
      return result;
  }
  function testPoints(y, points) {
      if (typeof(p.testLine)!=="undefined") {
          p.testLine.remove();
      }
      var i,ii;
      if (typeof(p.testPoints)!=="undefined") {
          for (i = 0, ii = p.testPoints.length; i<ii; i++) {
              p.testPoints[i].remove();
          }
      } else {
          p.testPoints = [];
      }
      var path = "M0," + y + "L"+$(p.selector).width() + ","+y;
      p.testLine = p.paper.path("M0," + y + "L"+$(selector).width() + ","+y);
      for (i = 0, ii = points.length; i<ii; i++) {
          p.testPoints.push(p.paper.rect(points[i],y,2,2));
      }
  }

  function verticalRegions(side, inclusive) {
      /*if inclusive is set to false, we only get sectors completely on the side*/
      if (typeof(inclusive)==="undefined") {
          inclusive = true;
      }
      var path, p1, p2, regions = [], top, bottom, pointType, bigSector, swap, center;
      function include(p1, p2, center) {
          if (side === "near") {
              return [m*p1[0] <= m*center[0], m*p2[0] <= m*center[0]];
          } else {
              return [m*p1[0] > m*center[0], m*p2[0] > m*center[0]];
          }
      }
      for (var i = 0, ii = p.sectorObjs.length; i<ii; i++) {
          path = p.sectorObjs[i].attr("path");
          center = [path[0][1], path[0][2]];
          top = p.options["margin-y"]*p.height;
          bottom = p.height - p.options["margin-y"]*p.height;
          p1 = [path[1][1], path[1][2]];
          p2 = [path[2][6], path[2][7]];
          if (side === "right") {
              swap = p1;
              p1 = p2;
              p2 = swap;
          }
          if (m===-1) {
              swap = p1;
              p1 = p2;
              p2 = swap;
          }
          pointType = include(p1, p2, center);
          bigSector = p.sectorMeta[i].value/p.sectorMeta[i].total > 0.5;
          if (pointType[0] && !pointType[1] && !bigSector && inclusive) {
              //first point on label side, second point far side
              regions.push([[p1[1], bottom], i]);
          } else if (!pointType[0] && pointType[1] && bigSector && inclusive) {
              //first point on far side, second point on near side, big sector
              regions.push([[p2[1], top], i]);
          } else if (!pointType[0] && pointType[1] && !bigSector && inclusive) {
              //first point on far side, second point label side
              regions.push([[p2[1], top], i]);
          } else if (pointType[0] && !pointType[1] && bigSector && inclusive) {
              //first point on near side, second point far side, big sector
              regions.push([[p1[1], bottom], i]);
          } else if (pointType[0] && pointType[1] && bigSector && inclusive) {
              //sector is larger than half and both ends cross over middle onto label side
              if (Math.abs(top - p2[1]) > Math.abs(bottom - p1[1])) {
                  regions.push([[p2[1], top], i]);
              } else {
                  regions.push([[p1[1], bottom], i]);
              }
              //regions.push([[p2[1], top], i]);
              //regions.push([[p1[1], bottom], i]);
          } else if (pointType[0] && pointType[1] && !bigSector) {
              //whole sector on label side
              regions.push([[p1[1], p2[1]], i]);
          } else if (!pointType[0] && !pointType[1] && bigSector && inclusive) {
              //both sector ends are on far side but it's big which means it takes up the whole near side
              regions.push([[top, bottom], i]);
          } else {
              //whole sector on far side - don't care
          }
      }
      regions.sort(function(a, b) {
          return (a[0][0] + a[0][1] - b[0][0] - b[0][1]);
      });
      return {
          regions: regions,
          center: center
      };
  }
  function testRegions(regions) {
      if (typeof(p.testRegions)!=="undefined") {
          for (var j = 0, jj = p.testRegions.length; j<jj; j++) {
              p.testRegions[j].remove();
          }
      }
      p.testRegions = [];
      for (var i = 0, ii = regions.length; i<ii; i++) {
          p.testRegions.push(p.paper.path("M0," + regions[i][0][0] + " L"+Math.round(p.width)+","+regions[i][0][0]));
          p.testRegions.push(p.paper.path("M0," + regions[i][0][1] + " L"+Math.round(p.width)+","+regions[i][0][1]));
          p.testRegions.push(p.paper.text((m===1 ? 1: 3)*p.width/4,(regions[i][0][0] + regions[i][0][1])/2, regions[i][1]));
      }
  }
  var m = p.options.labelAreaPosition==="left" ? 1: -1;
  var labelSideRegions = verticalRegions("near");
  var center = labelSideRegions.center;
  labelSideRegions = labelSideRegions.regions;
  var farSideRegions = verticalRegions("far",false).regions;
  //testRegions(labelSideRegions);

  //console.log(labelSideRegions, farSideRegions);
  function findlabelOrder(nearSide, farSide) {
      var first = [], last = [], middle = [], r = [];
      /*loop through far side first*/
      var median = center[1];
      for (var i = 0, ii = farSide.length; i<ii; i++) {
          if ((farSide[i][0][0] + farSide[i][0][1])/2 > median) {
              last.unshift(farSide[i][1]);
          } else {
              first.unshift(farSide[i][1]);
          }
      }
      for (i = 0, ii = nearSide.length; i<ii; i++) {
          middle.push(nearSide[i][1]);
      }
      r = r.concat(first);
      r = r.concat(middle);
      r = r.concat(last);
      return r;
  }
  var labelOrder = findlabelOrder(labelSideRegions, farSideRegions);
  function getLabelCoords() {
      var r = [];
      var lineHeight = $(selector).css("font-size").replace("px","")*1.5*p.options.labelSeparation, thisLineHeight = 0;
      var pos = p.height/2 - labelOrder.length*lineHeight/2;
      if (typeof(p.options.labelVerticalStart) !== "undefined") {
          pos = p.options.labelVerticalStart * p.height;
      }
      var currentSector;
      for (var i = 0, ii = labelOrder.length; i<ii; i++) {
          currentSector = labelOrder[i];
          r[currentSector] = [m*0.02+((m===-1) ? $(selector).width() : 0),pos];
          pos += thisLineHeight/2;
          var text = p.options.labelFormatter(labelOrder[i], p.data[labelOrder[i]], p.sectorMeta[labelOrder[i]].total);
          if (typeof(p.data[labelOrder[i]].customLabel)!=="undefined") {
              text = p.data[labelOrder[i]].customLabel;
          }
          if (text.indexOf("\n")!==-1) {
              thisLineHeight = 2*lineHeight;
          } else {
              thisLineHeight = lineHeight;
          }
          if (i===0) {
              pos += thisLineHeight/2;
          }
          pos += thisLineHeight/2;
      }
      return r;
  }
  function getLines(order, labelCoords, nearSide, farSide, center) {
      var r = [];
      var sector, labelCenters = {}, iOrder = (function(o) {
          var r = [];
          for (var i = 0, ii = o.length; i<ii; i++) {
              r[o[i]] = i;
          }
          return r;
      }(order));
      var lineHeight = $(selector).css("font-size").replace("px","")*1.5*p.options.labelLineSeparation;

      function testLabelInVerticalRegion(l) {
          var min, max;
          for (var i = 0, ii = nearSide.length; i<ii; i++) {
              if (nearSide[i][1]===l) {
                  min = Math.min(nearSide[i][0][0], nearSide[i][0][1]);
                  max = Math.max(nearSide[i][0][0], nearSide[i][0][1]);
                  if (labelCenters[l] > min && labelCenters[l] < max) {
                      return true;
                  }
              }
          }
          return false;
      }
      function inNearSide(sector) {
          var sCenter = getSectorArcCenter(sector);
          return (m*sCenter[0] < m*center[0]);
      }
      function sideIndex(sideRegions, sector)  {
          for (var i = 0, ii = sideRegions.length; i<ii; i++) {
              if (sector === sideRegions[i][1]) {
                  return i;
              }
          }
      }
      for (var i = 0, ii = order.length; i<ii; i++) {
          sector = order[i];
          labelCenters[sector] = labelCoords[sector][1];
      }
      var lineInSector = [];
      for (i = 0, ii = order.length; i<ii; i++) {
          sector = order[i];
          lineInSector[sector] = false;
          if (testLabelInVerticalRegion(sector)) {
              lineInSector[sector] = true;
          }
      }
      /*start with a straight line*/
      var firstLine;
      for (i = 0, ii = lineInSector.length;i<ii; i++) {
          if (lineInSector[i]===true) {
              firstLine = i;
          }
      }
      /*if there are none, start with the middle label*/
      if (typeof(firstLine)==="undefined") {
          firstLine = order[Math.floor(order.length/2)];
      }
      var sectorsLeft = order.length;
      sector = firstLine;
      var positionInOrder = iOrder[sector];
      var leptOutTop = false, leptOutBottom = false;
      var leapSize = 1;
      var bends = {
          bottom: {vertical:  center[1] + p.baseRy + lineHeight/5},
          top: {vertical: center[1] - p.baseRy - lineHeight/5}
      };
      var region;
      function getSectorCenter(s, y) {
          function angle(v) {
              return 360*v/p.sectorMeta[s].total + p.options.startAngle;
          }
          var theta0 = angle(p.sectorMeta[s].start),
              theta1 = angle(p.sectorMeta[s].start + p.sectorMeta[s].value),
              midpoint;
          var points = horizontalIntersectWithSector(y, theta0, theta1, p.baseRx, p.baseRy, center[0], center[1]);
          if (points.length === 1) {
              midpoint = points[0];
          } else {
              midpoint = (points[0] + points[1])/2;
          }
          return [midpoint, y];
      }
      function getSectorArcCenter(s) {
          return p.getSectorArcCenter(s, center);
      }
      var bound;
      var regionDivider;
      while (sectorsLeft > 0) {
          if (lineInSector[sector]) {
              /*if (typeof(region)==="undefined") {
                  region = "top";
              }*/
              /*same side, in region*/
              var xMiddle = getSectorCenter(sector, labelCenters[sector]);
              r[sector] = [
                  ["labelWidth", labelCenters[sector]],
                  [xMiddle[0], labelCenters[sector]]
              ];
              if (sector===firstLine) {
                  regionDivider = labelCenters[sector];
              }
          } else if (inNearSide(sector)) {
              /*same side, not in region*/
              //var sectorArcCenter = getSectorArcCenter(sector);

             // console.log(JSON.stringify(bends), sector);

              var lsector = sideIndex(labelSideRegions, sector);
              var vCenter = (labelSideRegions[lsector][0][0] + labelSideRegions[lsector][0][1])/2;

              if (typeof(regionDivider)==="undefined") {
                  regionDivider = vCenter;
              }

              //if (typeof(region)==="undefined") {
                  region = labelCenters[sector] < regionDivider ? "top" : "bottom";
              //}
              var hCenter = getSectorCenter(sector, vCenter);
              var intersection = lineIntersectWithCircle(labelCenters[sector], center[1], p.baseRx, p.baseRy);
              bound = center[0] - m*intersection;
              bound = Math.min(bound, center[0] - m*lineIntersectWithCircle(vCenter, center[1], p.baseRx, p.baseRy));
              if ((vCenter > center[1]) && (labelCenters[sector] < center[1]) || (vCenter < center[1]) && (labelCenters[sector] > center[1])) {
                  bound = center[0] - m*(p.baseRx);
              }
              if (typeof(bends[region].near)==="undefined") {
                  bends[region].near = bound;
              }
              if (isNaN(bound)) {
                  bends[region].near = Math.min(bends[region].near*m,hCenter[0]*m)*m;
                  r[sector] = [
                      ["labelWidth", labelCenters[sector]],
                      [hCenter[0], labelCenters[sector]],
                      [hCenter[0], vCenter]
                  ];
              } else {
                  bends[region].near = Math.min(bound*m, bends[region].near*m)*m;
                  r[sector] = [
                      ["labelWidth", labelCenters[sector]],
                      [bends[region].near - m*lineHeight, labelCenters[sector]],
                      [bends[region].near - m*lineHeight, vCenter],
                      [hCenter[0], vCenter]
                  ];
              }
              bends[region].near -= lineHeight*m;
          } else {
              /*far side*/
               if (typeof(regionDivider)==="undefined") {
                   if (positionInOrder > iOrder.length / 2) {
                      region = "bottom";
                  } else {
                      region = "top";
                  }

              } else {
                  region = labelCenters[sector] < regionDivider ? "top" : "bottom";
              }
              var sectorArcCenter = getSectorArcCenter(sector);
              bound = center[0] - m*lineIntersectWithCircle(labelCenters[sector], center[1], p.baseRx, p.baseRy);
              if (typeof(bends[region].near)==="undefined") {
                  bends[region].near = bound;
              }
              bends[region].near = Math.min(bends[region].near*m, bound*m)*m;

              if (bends[region].vertical > labelCenters[sector] && region==="top" ||
                  bends[region].vertical < labelCenters[sector] && region==="bottom") {
                  bends[region].vertical = labelCenters[sector];
              }
              r[sector] = [
                  ["labelWidth", labelCenters[sector]],
                  [bends[region].near - m*lineHeight, labelCenters[sector]],
                  [bends[region].near - m*lineHeight, bends[region].vertical],
                  [sectorArcCenter[0], bends[region].vertical],
                  sectorArcCenter
              ];
              bends[region].near -= lineHeight*m;
              bends[region].vertical += (region==="top" ? -1 : 1)*lineHeight/5;
          }
          if (leptOutBottom) {
              positionInOrder--;
          }
          if (leptOutTop) {
              positionInOrder++;
          }
          if (!leptOutTop && !leptOutBottom) {
              positionInOrder += leapSize;
              //region = leapSize > 0 ? "bottom" : "top";
              if (positionInOrder < 0) {
                  leptOutTop = true;
                  positionInOrder -= leapSize;
                  positionInOrder++;
                  //region="bottom";
              }
              if (positionInOrder >= order.length) {
                  leptOutBottom = true;
                  positionInOrder -= leapSize;
                  positionInOrder--;
                 // region="top";
              }
              leapSize = ((leapSize > 0) ? -1 : 1) - leapSize;
          }
          sector = order[positionInOrder];
          sectorsLeft--;
      }
      return r;
  }
  var labelCoords = getLabelCoords();
  return {
      labels: labelCoords,
      lines: getLines(labelOrder, labelCoords, labelSideRegions, farSideRegions, center)
  };
};
};
